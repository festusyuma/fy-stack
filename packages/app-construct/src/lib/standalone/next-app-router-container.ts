import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ecrDeployment from 'cdk-ecr-deployment';
import { Construct } from 'constructs';

import { staticDeployment } from '../shared/next-app-router';
import type { StandaloneApp } from './types';
import type { DockerImageAssetOptions } from 'aws-cdk-lib/aws-ecr-assets';

export type NextAppRouterProps = StandaloneApp & {
  container?: DockerImageAssetOptions;
};

export class NextAppRouterContainer extends Construct {
  constructor(scope: Construct, id: string, props: NextAppRouterProps) {
    super(scope, id);

    const stackName = cdk.Stack.of(this).stackName;

    const repo = new ecr.Repository(this, 'Repository', {
      emptyOnDelete: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const artifactBucket = new s3.Bucket(this, 'ArtifactStorage', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const container = new ecrAssets.DockerImageAsset(this, 'ContainerAsset', {
      directory: props.output,
      platform: ecrAssets.Platform.LINUX_AMD64,
      ...props.container,
    });

    const deployment = staticDeployment(this, artifactBucket, props.output);

    new ecrDeployment.ECRDeployment(this, 'DeployedContainer', {
      src: new ecrDeployment.DockerImageName(container.imageUri),
      dest: new ecrDeployment.DockerImageName(
        cdk.Fn.join(':', [repo.repositoryUri, props.version])
      ),
    });

    new ssm.StringParameter(this, 'RepositoryParam', {
      parameterName: `/${stackName}/repository`,
      stringValue: repo.repositoryName,
    });

    new ssm.StringParameter(this, 'RepositoryParam', {
      parameterName: `/${stackName}/artifacts`,
      stringValue: artifactBucket.bucketName,
    });

    new ssm.StringParameter(this, 'TagParam', {
      parameterName: `/${stackName}/tag`,
      stringValue: props.version,
    });

    new ssm.StringParameter(this, 'StaticFilesKeyParam', {
      parameterName: `/${stackName}/files/staticFiles/key`,
      stringValue: deployment.files.staticFiles.key,
    });

    new ssm.StringParameter(this, 'PublicFilesKeyParam', {
      parameterName: `/${stackName}/files/publicFiles/key`,
      stringValue: deployment.files.publicFiles.key,
    });
  }
}
