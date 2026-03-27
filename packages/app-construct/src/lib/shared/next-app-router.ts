import path from 'node:path';

import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigin from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export type AppFile = {
  artifactBucket: s3.IBucket;
  staticFiles?: { deployment?: s3Deploy.BucketDeployment; key: string };
  publicFiles?: { deployment?: s3Deploy.BucketDeployment; key: string };
};

export function filesFromSSM(scope: Construct, reference: string) {
  return {
    artifact: ssm.StringParameter.fromStringParameterName(
      scope,
      'ArtifactStorageParam',
      `/${reference}/artifacts`
    ).stringValue,
    publicFiles: {
      key: ssm.StringParameter.fromStringParameterName(
        scope,
        'PublicFilesParam',
        `/${reference}/files/publicFiles/key`
      ).stringValue,
    },
    staticFiles: {
      key: ssm.StringParameter.fromStringParameterName(
        scope,
        'StaticFilesParam',
        `/${reference}/files/staticFiles/key`
      ).stringValue,
    },
  };
}

export function staticDeployment(
  app: Construct,
  bucket: s3.IBucket,
  output: string
) {
  const staticFiles = s3Deploy.Source.asset(path.join(output, '/.next/static'));
  const publicFiles = s3Deploy.Source.asset(path.join(output, '/public'));

  const staticDeployment = new s3Deploy.BucketDeployment(
    app,
    `StaticAssetDeployment`,
    {
      destinationBucket: bucket,
      sources: [staticFiles],
      destinationKeyPrefix: 'assets/static',
      retainOnDelete: false,
      extract: false,
    }
  );

  const publicDeployment = new s3Deploy.BucketDeployment(
    app,
    `PublicAssetDeployment`,
    {
      destinationBucket: bucket,
      sources: [publicFiles],
      destinationKeyPrefix: 'assets/public',
      retainOnDelete: false,
      extract: false,
    }
  );

  const files = {
    staticFiles: {
      deployment: staticDeployment,
      key: cdk.Fn.join('/', [
        'assets/static',
        cdk.Fn.select(0, staticDeployment.objectKeys),
      ]),
    },
    publicFiles: {
      deployment: publicDeployment,
      key: cdk.Fn.join('/', [
        'assets/public',
        cdk.Fn.select(0, publicDeployment.objectKeys),
      ]),
    },
  };

  if (!files.publicFiles || !files.staticFiles) {
    throw new Error('Failed to deploy static and public files');
  }

  return { files };
}

export function cloudfrontBehaviours(
  scope: Construct,
  staticBucket: s3.IBucket,
  serverOrigin: cloudfront.IOrigin,
  basePath: string,
  files: AppFile,
  isLambda = false
) {
  const strippedBasePath = basePath.replace(/^\/+|\/+$/g, '');

  if (files.publicFiles) {
    const publicFiles = s3Deploy.Source.bucket(
      files.artifactBucket,
      files.publicFiles.key
    );

    const deployment = new s3Deploy.BucketDeployment(
      scope,
      `${strippedBasePath}PublicDeployment`,
      {
        destinationBucket: staticBucket,
        sources: [publicFiles],
        destinationKeyPrefix: strippedBasePath
          ? `${strippedBasePath}/`
          : undefined,
        retainOnDelete: false,
      }
    );

    if (files.publicFiles.deployment) {
      deployment.node.addDependency(files.publicFiles.deployment);
    }
  }

  if (files.staticFiles) {
    const staticFiles = s3Deploy.Source.bucket(
      files.artifactBucket,
      files.staticFiles.key
    );

    const deployment = new s3Deploy.BucketDeployment(
      scope,
      `${strippedBasePath}StaticDeployment`,
      {
        destinationBucket: staticBucket,
        sources: [staticFiles],
        destinationKeyPrefix: strippedBasePath
          ? `${strippedBasePath}/_next/static/`
          : '_next/static/',
        retainOnDelete: false,
      }
    );

    if (files.staticFiles.deployment) {
      deployment.node.addDependency(files.staticFiles.deployment);
    }
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

  const imageCachePolicyID = ssm.StringParameter.fromStringParameterName(
    scope,
    'NextAppRouterImagePolicyArn',
    '/fy-stack/ImagePolicyID'
  );

  const imageCachePolicy = cloudfront.CachePolicy.fromCachePolicyId(
    scope,
    'ImagePolicy',
    imageCachePolicyID.stringValue
  );

  const appBehaviour: cloudfront.BehaviorOptions = {
    origin: serverOrigin,
    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
    compress: true,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    originRequestPolicy: isLambda
      ? cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
      : cloudfront.OriginRequestPolicy.ALL_VIEWER,
    responseHeadersPolicy:
      cloudfront.ResponseHeadersPolicy
        .CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS,
  };

  return {
    [`${basePath}/_next/image`]: Object.assign({}, appBehaviour, {
      cachePolicy: imageCachePolicy,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
    }),
    [`${basePath}/_next/*`]: staticBehavior,
    [`${basePath}/*.*`]: staticBehavior,
    [`${basePath}/*`]: appBehaviour,
  };
}
