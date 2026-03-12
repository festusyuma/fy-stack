import type { DockerImageAssetOptions } from 'aws-cdk-lib/aws-ecr-assets';

export type StandaloneContainer = {
  output: string;
  version: string;
  container?: DockerImageAssetOptions;
};
