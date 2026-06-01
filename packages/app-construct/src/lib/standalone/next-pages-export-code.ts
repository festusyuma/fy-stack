import path from 'node:path';

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

import type { StandaloneApp } from './types';

export type NextPagesExportCodeProps = StandaloneApp;

export class NextPagesExportCode extends Construct {
  constructor(scope: Construct, id: string, props: NextPagesExportCodeProps) {
    super(scope, id);

    const stackName = cdk.Stack.of(this).stackName;

    const artifactBucket = new s3.Bucket(this, 'ArtifactStorage', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const staticPrefix = `${props.version}/assets/static`;
    const publicPrefix = `${props.version}/assets/public`;

    const staticDeployment = new s3Deploy.BucketDeployment(
      this,
      'StaticDeployment',
      {
        destinationBucket: artifactBucket,
        sources: [s3Deploy.Source.asset(path.join(props.output, '/.next'))],
        destinationKeyPrefix: staticPrefix,
        retainOnDelete: true,
        extract: false,
      }
    );

    const publicDeployment = new s3Deploy.BucketDeployment(
      this,
      'PublicDeployment',
      {
        destinationBucket: artifactBucket,
        sources: [s3Deploy.Source.asset(path.join(props.output, '/public'))],
        destinationKeyPrefix: publicPrefix,
        retainOnDelete: true,
        extract: false,
      }
    );

    const staticKey = cdk.Fn.join('/', [
      staticPrefix,
      cdk.Fn.select(0, staticDeployment.objectKeys),
    ]);

    const publicKey = cdk.Fn.join('/', [
      publicPrefix,
      cdk.Fn.select(0, publicDeployment.objectKeys),
    ]);

    const versions = [props.version, 'latest'];
    const parameters: ssm.IParameter[] = [];

    for (const v of versions) {
      parameters.push(
        new ssm.StringParameter(this, `ArtifactsParamV${v}`, {
          parameterName: `/${stackName}/${v}/artifacts`,
          stringValue: artifactBucket.bucketName,
        }),
        new ssm.StringParameter(this, `StaticFilesKeyParamV${v}`, {
          parameterName: `/${stackName}/${v}/files/staticFiles/key`,
          stringValue: staticKey,
        }),
        new ssm.StringParameter(this, `PublicFilesKeyParamV${v}`, {
          parameterName: `/${stackName}/${v}/files/publicFiles/key`,
          stringValue: publicKey,
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
