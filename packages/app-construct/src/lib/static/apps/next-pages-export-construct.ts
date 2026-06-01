import * as path from 'node:path';

import * as cdk from 'aws-cdk-lib';
import type { HttpRouteIntegration } from 'aws-cdk-lib/aws-apigatewayv2';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigin from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

import { filesFromSSM } from '../../shared/next-app-router';
import { AppConstruct, AppProperties } from '../types';

export class NextPagesExportConstruct
  extends Construct
  implements AppConstruct
{
  private readonly static: s3.Bucket;

  constructor(scope: Construct, id: string, props: AppProperties) {
    super(scope, id);

    this.static = new s3.Bucket(this, `StaticBucket`, {
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

    if ('output' in props) {
      new s3Deploy.BucketDeployment(this, `StaticDeployment`, {
        destinationBucket: this.static,
        sources: [s3Deploy.Source.asset(path.join(props.output, '/.next'))],
        retainOnDelete: false,
        memoryLimit: 512,
      });

      new s3Deploy.BucketDeployment(this, `PublicDeployment`, {
        destinationBucket: this.static,
        sources: [s3Deploy.Source.asset(path.join(props.output, '/public'))],
        destinationKeyPrefix: 'public',
        retainOnDelete: false,
        memoryLimit: 512,
      });
    } else {
      const fileParams = filesFromSSM(this, props.reference, props.version);
      const artifactBucket = s3.Bucket.fromBucketName(
        this,
        'ArtifactBucket',
        fileParams.artifact
      );

      new s3Deploy.BucketDeployment(this, `StaticDeployment`, {
        destinationBucket: this.static,
        sources: [
          s3Deploy.Source.bucket(artifactBucket, fileParams.staticFiles.key),
        ],
        retainOnDelete: false,
        memoryLimit: 512,
      });

      new s3Deploy.BucketDeployment(this, `PublicDeployment`, {
        destinationBucket: this.static,
        sources: [
          s3Deploy.Source.bucket(artifactBucket, fileParams.publicFiles.key),
        ],
        destinationKeyPrefix: 'public',
        retainOnDelete: false,
        memoryLimit: 512,
      });
    }
  }

  cloudfront(path: string): Record<string, cloudfront.BehaviorOptions> {
    const staticOrigin = new cloudfrontOrigin.S3StaticWebsiteOrigin(
      this.static
    );

    const staticBehavior: cloudfront.BehaviorOptions = {
      origin: staticOrigin,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      compress: true,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };

    return {
      [`${path}/*`]: staticBehavior,
    };
  }

  cloudfrontPolicy(distributionId: string) {
    throw new Error(`cloudfrontPolicy not supported for ${this}`);
  }

  api(): Record<string, HttpRouteIntegration> {
    throw new Error('api not supported for this construct');
  }

  static parse<T>(params: T) {
    return params;
  }
}
