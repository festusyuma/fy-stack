import path from 'node:path';

import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import type { Construct } from 'constructs';

import { containerParamsFromSSM } from '../../shared/container-from-param';
import type { AppProperties, AppSource } from '../types';

type Props = AppSource &
  Pick<AppProperties, 'env' | 'port' | 'logGroup' | 'taskDefinition'>;

export function taskDefinitionImage(
  scope: Construct,
  id: string,
  props: Props
) {
  let image;
  let containerProps;

  if ('output' in props) {
    const { image: imageProps, ..._containerProps } = props.container ?? {};

    image = ecs.ContainerImage.fromAsset(path.join(props.output), {
      platform: ecrAssets.Platform.LINUX_AMD64,
      ...(imageProps ?? {}),
      buildArgs: {
        PORT: props.port.toString(),
        ...(imageProps?.buildArgs ?? {}),
      },
    });

    containerProps = _containerProps;
  } else {
    const params = containerParamsFromSSM(
      scope,
      props.reference,
      props.version
    );

    const repository = ecr.Repository.fromRepositoryName(
      scope,
      `${id}Repository`,
      params.repository
    );

    image = ecs.ContainerImage.fromEcrRepository(repository, params.tag);
    containerProps = props.container;
  }

  return props.taskDefinition.addContainer(id, {
    image,
    logging: new ecs.AwsLogDriver({
      streamPrefix: "app",
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
