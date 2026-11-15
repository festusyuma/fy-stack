import path from 'node:path';

import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigin from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

import { deployThenPrune } from './deploy-then-prune';
import { stripBasePathAssociation } from './strip-base-path';

export type AppFile = {
  artifactBucket: s3.IBucket;
  staticFiles?: { deployment?: s3Deploy.BucketDeployment; key: string };
  publicFiles?: { deployment?: s3Deploy.BucketDeployment; key: string };
};

export function filesFromSSM(
  scope: Construct,
  reference: string,
  version = 'latest'
) {
  return {
    artifact: ssm.StringParameter.fromStringParameterName(
      scope,
      `ArtifactStorageParamV${version}`,
      `/${reference}/${version}/artifacts`
    ).stringValue,
    publicFiles: {
      key: ssm.StringParameter.fromStringParameterName(
        scope,
        `PublicFilesParamV${version}`,
        `/${reference}/${version}/files/publicFiles/key`
      ).stringValue,
    },
    staticFiles: {
      key: ssm.StringParameter.fromStringParameterName(
        scope,
        `StaticFilesParamV${version}`,
        `/${reference}/${version}/files/staticFiles/key`
      ).stringValue,
    },
  };
}

export function staticDeployment(
  app: Construct,
  bucket: s3.IBucket,
  output: string,
  version?: string,
  standalone = false
) {
  const staticFiles = s3Deploy.Source.asset(path.join(output, '/.next/static'));
  const publicFiles = s3Deploy.Source.asset(path.join(output, '/public'));

  const staticPrefix = version ? `${version}/assets/static` : 'assets/static';
  const publicPrefix = version ? `${version}/assets/public` : 'assets/public';

  const staticDeployment = new s3Deploy.BucketDeployment(
    app,
    `StaticAssetDeployment`,
    {
      destinationBucket: bucket,
      sources: [staticFiles],
      destinationKeyPrefix: staticPrefix,
      retainOnDelete: standalone,
      extract: false,
      memoryLimit: 512,
    }
  );

  const publicDeployment = new s3Deploy.BucketDeployment(
    app,
    `PublicAssetDeployment`,
    {
      destinationBucket: bucket,
      sources: [publicFiles],
      destinationKeyPrefix: publicPrefix,
      retainOnDelete: standalone,
      extract: false,
      memoryLimit: 512,
    }
  );

  const files = {
    staticFiles: {
      deployment: staticDeployment,
      key: cdk.Fn.join('/', [
        staticPrefix,
        cdk.Fn.select(0, staticDeployment.objectKeys),
      ]),
    },
    publicFiles: {
      deployment: publicDeployment,
      key: cdk.Fn.join('/', [
        publicPrefix,
        cdk.Fn.select(0, publicDeployment.objectKeys),
      ]),
    },
  };

  if (!files.publicFiles || !files.staticFiles) {
    throw new Error('Failed to deploy static and public files');
  }

  return { files };
}

export function appFilesDeployment(
  scope: Construct,
  staticBucket: s3.IBucket,
  files: AppFile
) {
  const deployments: s3Deploy.BucketDeployment[] = [];
  const prunes: s3Deploy.BucketDeployment[] = [];
  let publicDeployment: s3Deploy.BucketDeployment | undefined;

  if (files.publicFiles) {
    const publicFiles = s3Deploy.Source.bucket(
      files.artifactBucket,
      files.publicFiles.key
    );

    const publicDeploy = deployThenPrune(scope, 'PublicDeployment', {
      destinationBucket: staticBucket,
      sources: [publicFiles],
      exclude: ['_next/*'],
      retainOnDelete: false,
      memoryLimit: 512,
    });

    publicDeployment = publicDeploy.deployment;
    prunes.push(publicDeploy.prune);

    if (files.publicFiles.deployment) {
      publicDeployment.node.addDependency(files.publicFiles.deployment);
    }

    deployments.push(publicDeployment);
  }

  if (files.staticFiles) {
    const staticFiles = s3Deploy.Source.bucket(
      files.artifactBucket,
      files.staticFiles.key
    );

    const { deployment: staticDeployment, prune } = deployThenPrune(
      scope,
      'StaticDeployment',
      {
        destinationBucket: staticBucket,
        sources: [staticFiles],
        destinationKeyPrefix: '_next/static/',
        retainOnDelete: false,
        memoryLimit: 512,
      }
    );

    prunes.push(prune);

    if (publicDeployment) staticDeployment.node.addDependency(publicDeployment);

    if (files.staticFiles.deployment) {
      staticDeployment.node.addDependency(files.staticFiles.deployment);
    }

    deployments.push(staticDeployment);
  }

  return { deployments, prunes };
}

export function createImageCachePolicy(scope: Construct) {
  const imageCachePolicyID = ssm.StringParameter.fromStringParameterName(
    scope,
    'NextAppRouterImagePolicyArn',
    '/fy-stack/ImagePolicyID'
  );

  return cloudfront.CachePolicy.fromCachePolicyId(
    scope,
    'ImagePolicy',
    imageCachePolicyID.stringValue
  );
}

export function cloudfrontBehaviours(
  scope: Construct,
  staticBucket: s3.IBucket,
  serverOrigin: cloudfront.IOrigin,
  imageCachePolicy: cloudfront.ICachePolicy,
  basePath: string,
  isLambda = false
) {
  const staticOrigin = new cloudfrontOrigin.S3StaticWebsiteOrigin(staticBucket);

  const staticBehavior: cloudfront.BehaviorOptions = {
    origin: staticOrigin,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
    cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
    compress: true,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    functionAssociations: stripBasePathAssociation(scope, basePath),
  };

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
    ...(basePath ? { [basePath]: appBehaviour } : {}),
  };
}
