import { NestedStack } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigin from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

import { StorageCdkStackProps } from './types';

export class StorageCdnStack extends NestedStack {
  storageOrigin: cloudfront.IOrigin;

  constructor(scope: Construct, id: string, props: StorageCdkStackProps) {
    super(scope, id, props);

    const bucket = s3.Bucket.fromBucketArn(
      this,
      'StorageBucket',
      props.bucketArn
    );

    const storageAccessControl = new cloudfront.S3OriginAccessControl(
      this,
      'StorageOriginAccessControl'
    );

    this.storageOrigin =
      cloudfrontOrigin.S3BucketOrigin.withOriginAccessControl(bucket, {
        originAccessControl: storageAccessControl,
      });
  }
}
