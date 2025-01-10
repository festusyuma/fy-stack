import { Attach, Attachable, EventResource, Grant, Grantable } from '@fy-stack/types';
import * as ec2 from "aws-cdk-lib/aws-ec2"
import * as ecrAssets from "aws-cdk-lib/aws-ecr-assets"
import * as ecs from "aws-cdk-lib/aws-ecs"
import * as iam from "aws-cdk-lib/aws-iam"
import * as pipes from "aws-cdk-lib/aws-pipes"
import { ITopicSubscription } from 'aws-cdk-lib/aws-sns';
import { SqsSubscription, SubscriptionProps } from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from "aws-cdk-lib/aws-sqs"
import { Construct } from 'constructs';

import { TaskConstructsProps } from './types';

export class TaskConstruct extends Construct implements EventResource, Grant, Attach {

  private readonly cluster: ecs.ICluster;
  
  public role: iam.Role
  public taskDefinition: ecs.FargateTaskDefinition
  private readonly vpc: ec2.IVpc

  constructor(scope: Construct, id: string, props: TaskConstructsProps) {
    super(scope, id);

    const { clusterArn, defaultImage, output, vpc, ...definitionProps } = props
    this.cluster = ecs.Cluster.fromClusterArn(this, "TaskCluster", clusterArn);
    this.vpc = vpc
    
    this.role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal("pipes.amazonaws.com")
    })

    this.taskDefinition = new ecs.FargateTaskDefinition(this, "Task", {
      cpu: 1024,
      memoryLimitMiB: 4096,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64
      },
      ...definitionProps
    });

    if (defaultImage) {
      const { image: containerProps, ...imageProps } = defaultImage

      this.taskDefinition.addContainer("DefaultImage", {
        image: ecs.ContainerImage.fromAsset(output, {
          platform: ecrAssets.Platform.LINUX_AMD64,
          ...containerProps
        }),
        logging: new ecs.AwsLogDriver({ streamPrefix: `${id}/task-runner` }),
        ...imageProps,
      });
    }
  }

  subscription(props: SubscriptionProps): ITopicSubscription {
    const queue = new sqs.Queue(this, "TaskQueue");
    const pipeRole = new iam.Role(this, "PipeRole", {
      assumedBy: new iam.ServicePrincipal("pipes.amazonaws.com")
    });

    new pipes.CfnPipe(this, "TaskPipe", {
      source: queue.queueArn,
      target: this.cluster.clusterArn,
      roleArn: pipeRole.roleArn,
      desiredState: "RUNNING",
      targetParameters: {
        ecsTaskParameters: {
          taskDefinitionArn: this.taskDefinition.taskDefinitionArn,
          launchType: "FARGATE",
          networkConfiguration: {
            awsvpcConfiguration: {
              assignPublicIp: "ENABLED",
              subnets: this.vpc.publicSubnets.map(v => v.subnetId),
            }
          },
          overrides: {
            containerOverrides: [
              {
                name: "DefaultImage",
                environment: [
                  { name: "TASK_NAME", value: "$.body.message" },
                  { name: "PAYLOAD", value: "$.body.payload" }
                ],
              }
            ]
          }
        }
      }
    });


    queue.grantConsumeMessages(pipeRole);
    this.taskDefinition.grantRun(pipeRole);

    return new SqsSubscription(queue, { ...props, rawMessageDelivery: true });
  }

  grant(...grantables: Grantable[]): void {
    for (const i in grantables) {
      grantables[i].grantable(this.role)
    }
  }

  attach(attachable: Record<string, Attachable>) {
    const params: Record<string, string> = {}
    Object.assign(
      params,
      ...Object.entries(attachable)
        .map(([key, val]) => {
          return Object.fromEntries(
            Object.entries(val?.attachable() ?? {})
              .map(([subKey, subVal]) => [`${key}_${subKey}`, subVal])
          )
        })
    )

    for (const i in params) {
      const container = this.taskDefinition.defaultContainer
      container?.addEnvironment(i, params[i])
    }
  }
}