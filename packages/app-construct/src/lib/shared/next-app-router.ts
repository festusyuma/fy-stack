import path from 'node:path';

import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigin from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export type AppFile = {
  staticFiles: s3Deploy.ISource;
  publicFiles: s3Deploy.ISource;
};

export function staticDeployment(app: Construct, output: string) {
  const staticBucket = new s3.Bucket(app, `StaticBucket`, {
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

  const staticFiles = s3Deploy.Source.asset(path.join(output, '/.next/static'));
  const publicFiles = s3Deploy.Source.asset(path.join(output, '/public'));

  new s3Deploy.BucketDeployment(app, `StaticDeployment`, {
    destinationBucket: staticBucket,
    sources: [staticFiles],
    destinationKeyPrefix: '_next/static',
    retainOnDelete: false,
  });

  new s3Deploy.BucketDeployment(app, `PublicDeployment`, {
    destinationBucket: staticBucket,
    sources: [publicFiles],
    destinationKeyPrefix: '',
    retainOnDelete: false,
  });

  return {
    staticBucket,
    files: { staticFiles, publicFiles },
  };
}

export function cloudfrontBehaviours(
  app: Construct,
  staticBucket: s3.Bucket,
  serverOrigin: cloudfront.IOrigin,
  basePath: string,
  files: AppFile
) {
  if (basePath) {
    // redeploy files for apps hosted in sub path
    new s3Deploy.BucketDeployment(app, `${basePath}StaticDeployment`, {
      destinationBucket: staticBucket,
      sources: [files.staticFiles],
      destinationKeyPrefix: `${basePath}/_next/static`,
      retainOnDelete: false,
    });

    new s3Deploy.BucketDeployment(app, `${basePath}PublicDeployment`, {
      destinationBucket: staticBucket,
      sources: [files.publicFiles],
      destinationKeyPrefix: basePath,
      retainOnDelete: false,
    });
  }

  const staticOrigin = new cloudfrontOrigin.S3StaticWebsiteOrigin(staticBucket);

  const staticBehavior: cloudfront.BehaviorOptions = {
    origin: staticOrigin,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
    cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
    compress: true,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  };

  const imageCachePolicy = new cloudfront.CachePolicy(app, 'ImagePolicy', {
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
    maxTtl: cdk.Duration.days(365),
    enableAcceptEncodingGzip: true,
    enableAcceptEncodingBrotli: true,
  });

  const appBehaviour: cloudfront.BehaviorOptions = {
    origin: serverOrigin,
    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
    compress: true,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
    responseHeadersPolicy:
      cloudfront.ResponseHeadersPolicy
        .CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS,
  };

  return {
    [`${basePath}/_next/image`]: {
      ...appBehaviour,
      cachePolicy: imageCachePolicy,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
    },
    [`${basePath}/_next/*`]: staticBehavior,
    [`${basePath}/*.ico`]: staticBehavior,
    [`${basePath}/*.png`]: staticBehavior,
    [`${basePath}/*.svg`]: staticBehavior,
    [`${basePath}/*.jpg`]: staticBehavior,
    [`${basePath}/*.jpeg`]: staticBehavior,
    [`${basePath}/*`]: appBehaviour,
  };
}
