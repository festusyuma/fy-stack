import fs from 'node:fs';
import path from 'node:path';

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

import { codeDeployment } from '../shared/code-deployment';
import { staticDeployment } from '../shared/next-app-router';
import type { StandaloneApp } from './types';

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

    const versions = [props.version, 'latest'];
    const parameters: ssm.IParameter[] = [];

    for (const v of versions) {
      parameters.push(
        new ssm.StringParameter(this, `ArtifactsParamV${v}`, {
          parameterName: `/${stackName}/${v}/artifacts`,
          stringValue: artifactBucket.bucketName,
        }),
        new ssm.StringParameter(this, `CodeFilesKeyParamV${v}`, {
          parameterName: `/${stackName}/${v}/code`,
          stringValue: code,
        }),
        new ssm.StringParameter(this, `CodeCMDParamV${v}`, {
          parameterName: `/${stackName}/${v}/code/handler`,
          stringValue: 'run.sh',
        }),
        new ssm.StringParameter(this, `StaticFilesKeyParamV${v}`, {
          parameterName: `/${stackName}/${v}/files/staticFiles/key`,
          stringValue: deployment.files.staticFiles.key,
        }),
        new ssm.StringParameter(this, `PublicFilesKeyParamV${v}`, {
          parameterName: `/${stackName}/${v}/files/publicFiles/key`,
          stringValue: deployment.files.publicFiles.key,
        }),
        new ssm.StringParameter(this, `TagParamV${v}`, {
          parameterName: `/${stackName}/${v}/tag`,
          stringValue: props.version,
        })
      );
    }

    for (const p of parameters) {
      p.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
    }
  }
}
