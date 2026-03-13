import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';

export function publicBucket(scope: Construct, id: string) {
  return new s3.Bucket(scope, id, {
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS_ONLY,
    publicReadAccess: true,
    websiteIndexDocument: 'index.html',
    websiteErrorDocument: 'index.html',
    cors: [
      {
        allowedHeaders: ['*'],
        allowedOrigins: ['*'],
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
      },
    ],
  });
}
