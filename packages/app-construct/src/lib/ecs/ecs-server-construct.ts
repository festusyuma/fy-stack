import fs from 'node:fs';
import path from 'node:path';

import { AppType, Grant, Grantable, StackContext } from '@fy-stack/types';
import * as cdn from 'aws-cdk-lib/aws-cloudfront';
import * as cdnOrigin from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbV2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

import { ImageAppConstruct } from './apps/image-app-construct';
import { NextAppRouterConstruct } from './apps/next-app-router-construct';
import { AppConstruct, EcsConstructProps } from './types';

const AppBuilds = {
  [AppType.NEXT_APP_ROUTER]: NextAppRouterConstruct,
  [AppType.IMAGE_APP]: ImageAppConstruct,
};

type EcsServerConstructProps = EcsConstructProps['server'] & {
  vpc: ec2.IVpc;
  environmentPath: string;
  environment: string;
  cluster: ecs.Cluster;
};

export class EcsServerConstruct extends Construct implements Grant {
  public apps: Record<string, AppConstruct> = {};
  public definition: ecs.TaskDefinition;
  public service: ecs.BaseService;

  public loadBalancer?: {
    alb: elbV2.IApplicationLoadBalancer;
    listener: elbV2.IApplicationListener;
  };

  constructor(
    scope: Construct,
    id: string,
    private props: EcsServerConstructProps
  ) {
    super(scope, id);

    const appSecurityGroup = new ec2.SecurityGroup(this, 'AppSecurityGroup', {
      vpc: props.vpc,
    });

    const { definition, apps, cluster, ...serverProps } = props;

    this.definition = new ecs.FargateTaskDefinition(
      this,
      'ServerTaskDefinition',
      {
        cpu: 256,
        memoryLimitMiB: 512,
        runtimePlatform: {
          cpuArchitecture: ecs.CpuArchitecture.X86_64,
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        },
        ...(definition ?? {}),
      }
    );

    this.service = new ecs.FargateService(this, 'ServerService', {
      cluster,
      taskDefinition: this.definition,
      capacityProviderStrategies: [{ capacityProvider: 'FARGATE', weight: 1 }],
      desiredCount: 1,
      vpcSubnets: {
        subnetType: serverProps.assignPublicIp
          ? ec2.SubnetType.PUBLIC
          : ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [appSecurityGroup],
      propagateTags: ecs.PropagatedTagSource.SERVICE,
      ...serverProps,
    });

    this.service.connections.securityGroups[0].securityGroupId

    const serverOrigin = (
      port: number,
      containerName: string,
      appPath: string,
      healthPath?: string
    ) => this.serverOrigin(this.service, port, containerName, appPath, healthPath);

    serverOrigin.bind(this);

    Object.assign(
      this.apps,
      Object.fromEntries(
        Object.entries(apps).map(([key, app]) => {
          const AppTypeConstruct = AppBuilds[app.type];

          return [
            key,
            new AppTypeConstruct(this, `${key}App`, {
              appName: key,
              environmentPath: props.environmentPath,
              buildParams: AppTypeConstruct.parse(app.buildParams ?? {}),
              serverOrigin,
              taskDefinition: this.definition,
              ...app,
            }),
          ];
        })
      )
    );
  }

  grant(...grantables: Grantable[]): void {
    for (const i in grantables) {
      grantables[i].grantable(this.definition.taskRole);
    }
  }

  private serverOrigin(
    service: ecs.BaseService,
    port: number,
    containerName: string,
    appPath: string,
    healthPath?: string
  ) {
    if (!this.loadBalancer) this.loadBalancer = this.initLoadBalancer();

    const appFullPath = path.join(
      this.props.environmentPath,
      appPath || '/base'
    );

    const appTargetGroup = new elbV2.ApplicationTargetGroup(
      this,
      `${containerName}Target`,
      {
        vpc: this.props.vpc,
        protocol: elbV2.ApplicationProtocol.HTTP,
        targets: [
          service.loadBalancerTarget({
            containerPort: port,
            containerName: containerName,
          }),
        ],
        healthCheck: {
          path: path.join(appFullPath, healthPath ?? ''),
        },
      }
    );

    const origin = new cdnOrigin.LoadBalancerV2Origin(this.loadBalancer.alb, {
      originPath: appPath ? this.props.environmentPath : appFullPath,
      protocolPolicy: cdn.OriginProtocolPolicy.HTTP_ONLY,
    });

    this.loadBalancer.listener.addTargetGroups(`${containerName}Rule`, {
      conditions: [elbV2.ListenerCondition.pathPatterns([`${appFullPath}/*`])],
      priority: this.getAppPriority(appFullPath),
      targetGroups: [appTargetGroup],
    });

    return { origin, basePath: appFullPath };
  }

  initLoadBalancer() {
    if (this.props.loadBalancer && 'arn' in this.props.loadBalancer) {
      const alb = elbV2.ApplicationLoadBalancer.fromLookup(
        this,
        'LoadBalancer',
        { loadBalancerArn: this.props.loadBalancer.arn }
      );

      const listener = elbV2.ApplicationListener.fromLookup(
        this,
        'DefaultListener',
        { loadBalancerArn: this.props.loadBalancer.arn, listenerPort: 80 }
      );

      if (!listener) {
        throw new Error(
          `no HTTP:80 listener on ${this.props.loadBalancer.arn}`
        );
      }

      return { alb, listener };
    }

    const alb = new elbV2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc: this.props.vpc,
      vpcSubnets: {
        subnets: this.props.vpc.publicSubnets,
      },
      internetFacing: true,
    });

    const listener = alb.addListener('Listener', { port: 80 });
    listener.addAction('DefaultAction', {
      action: elbV2.ListenerAction.fixedResponse(400),
    });

    return { alb, listener };
  }

  getAppPriority(appPath: string): number {
    const configPath = './fy-stack.context.json';

    let config: StackContext = {};
    let priorityRage: [number, number] = [0, 1000];

    if (this.props.loadBalancer && 'priorityRange' in this.props.loadBalancer) {
      priorityRage = this.props.loadBalancer.priorityRange;
    }

    let priority = priorityRage[0];

    if (fs.existsSync(configPath)) {
      config = JSON.parse(
        fs.readFileSync(configPath).toString()
      ) as StackContext;

      if (config.loadBalancer?.priorities?.[appPath]) {
        priority = config.loadBalancer?.priorities?.[appPath];
      } else {
        const existingPriorities = Object.values(
          config.loadBalancer?.priorities ?? {}
        ).sort();

        while (existingPriorities.includes(priority)) {
          priority += 1;
        }

        if (priority > priorityRage[1])
          throw new Error(`Priority ${priority} exceeds priority range`);
      }
    }

    config = {
      loadBalancer: {
        ...(config.loadBalancer ?? {}),
        priorities: {
          ...(config.loadBalancer?.priorities ?? {}),
          [appPath]: priority,
        },
      },
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    return priority;
  }
}
