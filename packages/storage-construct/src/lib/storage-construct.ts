import { Attachable, CDNResource, Grantable } from '@fy-stack/types';
import * as cdk from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as dynamo from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

import { StorageCdnStack } from './storage-cdn-stack';
import type { StorageConstructProps } from './types';

/**
 * The StorageConstruct class is a specialized Construct in the AWS CDK that sets up an S3 bucket
 * This construct implements the {@link Attachable `Attachable`}, {@link Grantable `Grantable`} and {@link CDNResource `CDNResource`} interfaces.
 */
export class StorageConstruct
  extends Construct
  implements Attachable, Grantable, CDNResource
{
  public bucket: s3.IBucket;
  public table: dynamo.Table | undefined;

  constructor(scope: Construct, id: string, props: StorageConstructProps) {
    super(scope, id);

    const bucketProps: s3.BucketProps = {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedOrigins: ['*'],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.DELETE,
          ],
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"]
        },
      ],
    };

    Object.assign(
      bucketProps,
      props.retainOnDelete
        ? { removalPolicy: cdk.RemovalPolicy.RETAIN }
        : { removalPolicy: cdk.RemovalPolicy.DESTROY, autoDeleteObjects: true }
    );

    this.bucket = new s3.Bucket(this, 'Bucket', bucketProps);

    if (props.logTable) {
      this.table = new dynamo.Table(this, 'LogTable', {
        partitionKey: {
          name: 'key',
          type: dynamo.AttributeType.STRING,
        },
      });
    }
  }

  cloudfront(path: string) {
    const storageOriginStack = new StorageCdnStack(this, 'StorageCDNStack', {
      bucketArn: this.bucket.bucketArn,
    });

    const storageBehavior: cloudfront.BehaviorOptions = {
      compress: true,
      origin: storageOriginStack.storageOrigin,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };

    return { [`${path}/*`]: storageBehavior };
  }

  cloudfrontPolicy(distributionId: string) {
    const account = Stack.of(this).account;

    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      resources: ['arn:aws:s3:::' + this.bucket.bucketName + '/*'],
      conditions: {
        StringEquals: {
          'AWS:SourceArn':
            'arn:aws:cloudfront::' +
            account +
            ':distribution/' +
            distributionId,
        },
      },
    }).toStatementJson();
  }

  attachable() {
    return {
      NAME: this.bucket.bucketName,
      ARN: this.bucket.bucketArn,
      LOG_TABLE: this.table?.tableName ?? '',
    };
  }

  grantable(grant: iam.IGrantable) {
    grant.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:*'],
        resources: [`${this.bucket.bucketArn}/*`],
      })
    );

    if (this.table) this.table.grantFullAccess(grant);
  }
}
