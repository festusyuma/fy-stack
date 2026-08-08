import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

import { codeDeployment } from '../shared/code-deployment';
import type { StandaloneApp } from './types';

export type NodeCodeProps = StandaloneApp & {
  handler?: string;
};

export class NodeAppCode extends Construct {
  constructor(scope: Construct, id: string, props: NodeCodeProps) {
    super(scope, id);

    const stackName = cdk.Stack.of(this).stackName;

    const artifactBucket = new s3.Bucket(this, 'ArtifactStorage', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const code = codeDeployment(
      this,
      artifactBucket,
      props.output,
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
          stringValue: props.handler ?? 'index.handler',
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
