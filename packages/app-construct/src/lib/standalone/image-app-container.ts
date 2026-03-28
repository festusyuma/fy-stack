import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import type { DockerImageAssetOptions } from 'aws-cdk-lib/aws-ecr-assets';
import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ecrDeployment from 'cdk-ecr-deployment';
import { Construct } from 'constructs';

import type { StandaloneApp } from './types';

export type ImageAppProps = StandaloneApp & {
  container?: DockerImageAssetOptions;
  cmd: string[];
};

export class ImageAppContainer extends Construct {
  constructor(scope: Construct, id: string, props: ImageAppProps) {
    super(scope, id);

    const stackName = cdk.Stack.of(this).stackName;

    const repo = new ecr.Repository(this, 'Repository', {
      emptyOnDelete: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const container = new ecrAssets.DockerImageAsset(this, 'ContainerAsset', {
      directory: props.output,
      platform: ecrAssets.Platform.LINUX_AMD64,
      ...props.container,
    });

    new ecrDeployment.ECRDeployment(this, 'DeployedContainer', {
      src: new ecrDeployment.DockerImageName(container.imageUri),
      dest: new ecrDeployment.DockerImageName(
        cdk.Fn.join(':', [repo.repositoryUri, props.version || 'latest'])
      ),
    });

    const versions = [props.version, 'latest'];
    const parameters: ssm.IParameter[] = [];

    for (const v of versions) {
      parameters.push(
        new ssm.StringParameter(this, `RepositoryParam`, {
          parameterName: `/${stackName}/${v}/repository`,
          stringValue: repo.repositoryName,
        }),
        new ssm.StringParameter(this, `TagParam`, {
          parameterName: `/${stackName}/${v}/tag`,
          stringValue: props.version,
        }),
        new ssm.StringListParameter(this, `ImageCMD`, {
          parameterName: `/${stackName}/${v}/cmd`,
          stringListValue: props.cmd,
        })
      );
    }

    for (const p of parameters) {
      p.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
    }
  }
}
