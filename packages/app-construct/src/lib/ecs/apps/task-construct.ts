import {
  Attach,
  Attachable,
  EventResource,
  Grant,
  Grantable,
} from '@fy-stack/types';
import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as pipes from 'aws-cdk-lib/aws-pipes';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscription from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import { paramsFromAttachable } from '../../util/params-from-attachable';
import { TaskConstructsProps } from '../types';

export class TaskConstruct
  extends Construct
  implements EventResource, Grant, Attach
{
  public taskDefinition: ecs.FargateTaskDefinition;

  constructor(
    scope: Construct,
    id: string,
    private props: TaskConstructsProps
  ) {
    super(scope, id);

    const { container, output, ...definitionProps } = props;

    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'Task', {
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
      },
      ...definitionProps,
    });

    if (container) {
      const { image: imageProps, logDuration, ...containerProps } = container;

      this.taskDefinition.addContainer('DefaultImage', {
        image: ecs.ContainerImage.fromAsset(output, {
          platform: ecrAssets.Platform.LINUX_AMD64,
          ...imageProps,
        }),
        logging: new ecs.AwsLogDriver({
          streamPrefix: `${id}/task-runner`,
          logRetention: logDuration ?? logs.RetentionDays.ONE_DAY,
        }),
        ...containerProps,
      });
    }
  }

  subscription(
    props: snsSubscription.SubscriptionProps
  ): sns.ITopicSubscription {
    const queue = new sqs.Queue(this, 'TaskQueue');
    const pipeRole = new iam.Role(this, 'PipeRole', {
      assumedBy: new iam.ServicePrincipal('pipes.amazonaws.com'),
    });

    new pipes.CfnPipe(this, 'TaskPipe', {
      source: queue.queueArn,
      target: this.props.cluster.clusterArn,
      roleArn: pipeRole.roleArn,
      desiredState: 'RUNNING',
      targetParameters: {
        ecsTaskParameters: {
          taskDefinitionArn: this.taskDefinition.taskDefinitionArn,
          launchType: 'FARGATE',
          networkConfiguration: {
            awsvpcConfiguration: {
              assignPublicIp: 'ENABLED',
              subnets: this.props.vpc.publicSubnets.map((v) => v.subnetId),
            },
          },
          overrides: {
            containerOverrides: [
              {
                name: 'DefaultImage',
                environment: [
                  { name: 'TASK_NAME', value: '$.body.message' },
                  { name: 'PAYLOAD', value: '$.body.payload' },
                ],
              },
            ],
          },
        },
      },
    });

    queue.grantConsumeMessages(pipeRole);
    this.taskDefinition.grantRun(pipeRole);

    return new snsSubscription.SqsSubscription(queue, {
      ...props,
      rawMessageDelivery: true,
    });
  }

  grant(...grantables: Grantable[]): void {
    for (const i in grantables) {
      grantables[i].grantable(this.taskDefinition.taskRole);
    }
  }

  attach(attachable: Record<string, Attachable>) {
    const params: Record<string, string> = {};
    Object.assign(params, ...paramsFromAttachable(attachable));

    for (const i in params) {
      this.taskDefinition.defaultContainer?.addEnvironment(i, params[i]);
    }
  }

  static parse(params: unknown) {
    return params
  }
}
