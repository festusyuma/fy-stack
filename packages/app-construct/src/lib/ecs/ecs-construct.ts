import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

import { TaskConstruct } from './apps/task-construct';
import { EcsServerConstruct } from './ecs-server-construct';
import type { EcsConstructProps } from './types';

export class EcsConstruct extends Construct {
  public server?: EcsServerConstruct;
  public tasks: Record<string, TaskConstruct> = {};

  constructor(scope: Construct, id: string, props: EcsConstructProps) {
    super(scope, id);

    const appCluster = new ecs.Cluster(this, 'EcsCluster', {
      vpc: props.vpc,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    if (props.server) {
      this.server = new EcsServerConstruct(this, 'Server', {
        ...props.server,
        cluster: appCluster,
        environmentPath: props.environmentPath,
        environment: props.environment,
        vpc: props.vpc,
      });
    }

    if (props.tasks) {
      Object.assign(
        this.tasks,
        Object.fromEntries(
          Object.entries(props.tasks ?? {}).map(([key, app]) => {
            return [
              key,
              new TaskConstruct(this, `${key}Task`, {
                buildParams: TaskConstruct.parse(app.buildParams ?? {}),
                cluster: appCluster,
                vpc: props.vpc,
                ...app,
              }),
            ];
          })
        )
      );
    }
  }
}
