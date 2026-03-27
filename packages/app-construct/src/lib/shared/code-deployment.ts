import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export function codeDeployment(
  scope: Construct,
  bucket: s3.IBucket,
  output: string,
  version: string
) {
  const codeFiles = s3Deploy.Source.asset(output);
  const codePrefix = `assets/code/${version}`;

  const codeDeployment = new s3Deploy.BucketDeployment(
    scope,
    `CodeDeployment`,
    {
      destinationBucket: bucket,
      sources: [codeFiles],
      destinationKeyPrefix: codePrefix,
      retainOnDelete: true,
      extract: false,
    }
  );

  return cdk.Fn.join('/', [
    codePrefix,
    cdk.Fn.select(0, codeDeployment.objectKeys),
  ]);
}
