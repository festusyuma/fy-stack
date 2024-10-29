import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigin from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

import type { StorageConstructProps } from './types';

export class StorageConstruct extends Construct {
  public bucket: s3.IBucket;

  constructor(scope: Construct, id: string, props: StorageConstructProps ) {
    super(scope, id);

    const bucketProps: s3.BucketProps = {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    };

    Object.assign(
      bucketProps,
      props.retainOnDelete
        ? { removalPolicy: cdk.RemovalPolicy.RETAIN }
        : { removalPolicy: cdk.RemovalPolicy.DESTROY, autoDeleteObjects: true }
    );

    this.bucket = new s3.Bucket(this, 'Bucket', bucketProps);
  }

  cloudfront(path: string, cdnConstruct: Construct) {
    const bucket = s3.Bucket.fromBucketArn(
      cdnConstruct,
      'StorageBucket',
      this.bucket.bucketArn
    );

    const storageAccessControl = new cloudfront.S3OriginAccessControl(
      cdnConstruct,
      'StorageOriginAccessControl'
    );

    const storageOrigin =
      cloudfrontOrigin.S3BucketOrigin.withOriginAccessControl(bucket, {
        originAccessControl: storageAccessControl,
      });

    const storageBehavior: cloudfront.BehaviorOptions = {
      compress: true,
      origin: storageOrigin,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };

    return { [`${path}/*`]: storageBehavior };
  }
}
