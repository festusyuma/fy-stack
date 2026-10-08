import path from 'node:path';

import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigin from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

import { proxyPathHeaderCode } from './proxy-path-header';

export type AppFile = {
  artifactBucket: s3.IBucket;
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
  };
}

export function staticDeployment(
  app: Construct,
  bucket: s3.IBucket,
  output: string,
  version?: string
) {
  const publicFiles = s3Deploy.Source.asset(path.join(output, '/client'));
  const publicPrefix = version ? `${version}/assets/public` : 'assets/public';

  const publicDeployment = new s3Deploy.BucketDeployment(
    app,
    `PublicAssetDeployment`,
    {
      destinationBucket: bucket,
      sources: [publicFiles],
      destinationKeyPrefix: publicPrefix,
      retainOnDelete: true,
      extract: false,
      memoryLimit: 512,
    }
  );

  return {
    deployment: publicDeployment,
    key: cdk.Fn.join('/', [
      publicPrefix,
      cdk.Fn.select(0, publicDeployment.objectKeys),
    ]),
  };
}

export function cloudfrontBehaviours(
  scope: Construct,
  staticBucket: s3.IBucket,
  serverOrigin: cloudfront.IOrigin,
  basePath: string,
  files: AppFile,
  proxyPath?: string,
  isLambda = false
) {
  const strippedBasePath = basePath.replace(/^\/+|\/+$/g, '');
  let publicDeployment: s3Deploy.BucketDeployment | undefined;

  if (files.publicFiles) {
    const publicFiles = s3Deploy.Source.bucket(
      files.artifactBucket,
      files.publicFiles.key
    );

    publicDeployment = new s3Deploy.BucketDeployment(
      scope,
      `${strippedBasePath}PublicDeployment`,
      {
        destinationBucket: staticBucket,
        sources: [publicFiles],
        destinationKeyPrefix: strippedBasePath
          ? `${strippedBasePath}/`
          : undefined,
        retainOnDelete: false,
        prune: false,
        memoryLimit: 512,
      }
    );

    if (files.publicFiles.deployment) {
      publicDeployment.node.addDependency(files.publicFiles.deployment);
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

  const appBehaviour: cloudfront.BehaviorOptions = {
    origin: serverOrigin,
    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
    compress: true,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    originRequestPolicy: isLambda
      ? cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
      : cloudfront.OriginRequestPolicy.ALL_VIEWER_AND_CLOUDFRONT_2022,
    responseHeadersPolicy:
      cloudfront.ResponseHeadersPolicy
        .CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS,
    functionAssociations: proxyPath
      ? [
          {
            function: new cloudfront.Function(scope, 'ProxyPathHeader', {
              runtime: cloudfront.FunctionRuntime.JS_2_0,
              code: proxyPathHeaderCode(proxyPath),
            }),
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ]
      : [],
  };

  return {
    [`${basePath}/assets/*`]: staticBehavior,
    [`${basePath}/*.data`]: appBehaviour,
    [`${basePath}/*.*`]: staticBehavior,
    [`${basePath}/*`]: appBehaviour,
    ...(basePath ? { [basePath]: appBehaviour } : {}),
  };
}
