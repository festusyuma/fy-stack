import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

import type { StandaloneApp } from './types';

export type StaticWebsiteCodeProps = StandaloneApp;

export class StaticWebsiteCode extends Construct {
  constructor(scope: Construct, id: string, props: StaticWebsiteCodeProps) {
    super(scope, id);

    const stackName = cdk.Stack.of(this).stackName;

    const artifactBucket = new s3.Bucket(this, 'ArtifactStorage', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const filesPrefix = `${props.version}/assets/files`;

    const filesDeployment = new s3Deploy.BucketDeployment(
      this,
      'FilesDeployment',
      {
        destinationBucket: artifactBucket,
        sources: [s3Deploy.Source.asset(props.output)],
        destinationKeyPrefix: filesPrefix,
        retainOnDelete: true,
        extract: false,
      }
    );

    const filesKey = cdk.Fn.join('/', [
      filesPrefix,
      cdk.Fn.select(0, filesDeployment.objectKeys),
    ]);

    const versions = [props.version, 'latest'];
    const parameters: ssm.IParameter[] = [];

    for (const v of versions) {
      parameters.push(
        new ssm.StringParameter(this, `ArtifactsParamV${v}`, {
          parameterName: `/${stackName}/${v}/artifacts`,
          stringValue: artifactBucket.bucketName,
        }),
        new ssm.StringParameter(this, `FilesKeyParamV${v}`, {
          parameterName: `/${stackName}/${v}/files/key`,
          stringValue: filesKey,
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
