import * as cdk from 'aws-cdk-lib';
import { HttpRouteIntegration } from 'aws-cdk-lib/aws-apigatewayv2';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigin from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { z } from 'zod';

import { AppConstruct, AppProperties } from '../types';

const BuildParamsSchema = z.object({}).optional();

export class StaticWebsiteConstruct extends Construct implements AppConstruct {
  private readonly static: s3.Bucket;

  constructor(
    scope: Construct,
    id: string,
    props: AppProperties<z.infer<typeof BuildParamsSchema>>
  ) {
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

    new s3Deploy.BucketDeployment(this, `StaticDeployment`, {
      destinationBucket: this.static,
      sources: [s3Deploy.Source.asset(props.output)],
      retainOnDelete: false,
    });
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

  static parse(params: unknown) {
    return BuildParamsSchema.parse(params);
  }
}
