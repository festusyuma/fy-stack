import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ecrDeployment from 'cdk-ecr-deployment';
import { Construct } from 'constructs';

import { staticDeployment } from '../shared/next-app-router';
import type { StandaloneContainer } from './types';

export type NextAppRouterProps = StandaloneContainer;

export class NextAppRouterContainer extends Construct {
  constructor(scope: Construct, id: string, props: NextAppRouterProps) {
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

    const deployment = staticDeployment(this, props.output);

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
