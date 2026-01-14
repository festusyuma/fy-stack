import path from 'node:path';

import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import type { LogGroup } from 'aws-cdk-lib/aws-logs';

import type { AppProperties } from '../types';

type Props = {
  output: string;
  logGroup: LogGroup;
  taskDefinition: ecs.TaskDefinition;
  env?: Record<string, string>;
  port: number;
  container?: AppProperties['container'];
};

export function taskDefinitionImage(id: string, props: Props) {
  const { image, logDuration, ...containerProps } = props.container ?? {};

  return props.taskDefinition.addContainer(id, {
    image: ecs.ContainerImage.fromAsset(path.join(props.output), {
      platform: ecrAssets.Platform.LINUX_AMD64,
      ...(image ?? {}),
      buildArgs: {
        PORT: props.port.toString(),
        ...(image?.buildArgs ?? {}),
      },
    }),
    logging: new ecs.AwsLogDriver({
      streamPrefix: id,
      logGroup: props.logGroup,
    }),
    environment: {
      ...(props.env ?? {}),
      PORT: props.port.toString(),
    },
    portMappings: [{ containerPort: props.port }],
    ...(containerProps ?? {}),
  });
}
