import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

import { staticDeployment } from '../shared/next-app-router';
import type { StandaloneApp } from './types';
import { codeDeployment } from '../shared/code-deployment';
import path from 'node:path';
import fs from 'node:fs';

export type NextAppRouterProps = StandaloneApp & {
  cmd: string;
};

export class NextAppRouterCode extends Construct {
  constructor(scope: Construct, id: string, props: NextAppRouterProps) {
    super(scope, id);

    const stackName = cdk.Stack.of(this).stackName;

    const artifactBucket = new s3.Bucket(this, 'ArtifactStorage', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const deployment = staticDeployment(this, artifactBucket, props.output);
    const serverOutput = path.join(props.output, '/.next/standalone');

    fs.writeFileSync(path.join(serverOutput, 'run.sh'), props.cmd);

    const code = codeDeployment(
      this,
      artifactBucket,
      serverOutput,
      props.version
    );

    new ssm.StringParameter(this, 'RepositoryParam', {
      parameterName: `/${stackName}/artifacts`,
      stringValue: artifactBucket.bucketName,
    });

    new ssm.StringParameter(this, 'TagParam', {
      parameterName: `/${stackName}/tag`,
      stringValue: props.version,
    });

    new ssm.StringParameter(this, 'CodeFilesKeyParam', {
      parameterName: `/${stackName}/code`,
      stringValue: code,
    });

    new ssm.StringParameter(this, 'CodeFilesKeyParam', {
      parameterName: `/${stackName}/code/handler`,
      stringValue: 'run.sh',
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
