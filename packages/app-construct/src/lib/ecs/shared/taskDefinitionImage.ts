import path from 'node:path';

import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';

import { AppProperties } from '../types';

type Props = {
  output: string;
  taskDefinition: ecs.TaskDefinition;
  env?: Record<string, string>;
  port: number;
  container?: AppProperties['container'];
  environmentPath: string;
};

export function taskDefinitionImage(id: string, props: Props) {
  const { image, logDuration, ...containerProps } = props.container ?? {};

  return props.taskDefinition.addContainer(id, {
    image: ecs.ContainerImage.fromAsset(path.join(props.output), {
      platform: ecrAssets.Platform.LINUX_AMD64,
      ...(image ?? {}),
    }),
    logging: new ecs.AwsLogDriver({
      streamPrefix: `${props.environmentPath}/${id}`,
      logRetention: logDuration ?? logs.RetentionDays.ONE_DAY,
    }),
    environment: {
      ...(props.env ?? {}),
      PORT: props.port.toString(),
    },
    portMappings: [{ containerPort: props.port }],
    ...(containerProps ?? {}),
  });
}
