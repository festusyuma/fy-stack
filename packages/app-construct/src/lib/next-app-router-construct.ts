import { Attachable, Grantable } from '@fy-stack/types';
import * as cdk from 'aws-cdk-lib';
import type { HttpRouteIntegration } from 'aws-cdk-lib/aws-apigatewayv2';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigin from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import { ITopicSubscription } from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import { AppConstruct, AppProperties } from './types';
import { lambdaAttach } from './utils/lambda-attach';
import { lambdaGrant } from './utils/lambda-grant';
import * as path from 'node:path';
import * as fs from 'node:fs';

export class NextAppRouterConstruct extends Construct implements AppConstruct {
  public function: lambda.Function;
  public queue: sqs.Queue | undefined;

  private readonly static: s3.Bucket;

  constructor(scope: Construct, id: string, props: AppProperties) {
    super(scope, id);

    const region = cdk.Stack.of(this).region;

    this.static = new s3.Bucket(this, `StaticBucket`, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
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
      sources: [s3Deploy.Source.asset(path.join(props.output, "/.next/static")),],
      destinationKeyPrefix: "_next/static",
      retainOnDelete: false,
    });

    new s3Deploy.BucketDeployment(this, `PublicDeployment`, {
      destinationBucket: this.static,
      sources: [s3Deploy.Source.asset(path.join(props.output, "/public"))],
      destinationKeyPrefix: "",
      retainOnDelete: false,
    });

    const webAdapterLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'WebAdapterLayer',
      `arn:aws:lambda:${region}:753240598075:layer:LambdaAdapterLayerX86:16`
    );

    const environment = {
      AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
      PORT: '8080',
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    };

    Object.assign(environment, props.env);

    const serverOutput = path.join(props.output, "/.next/standalone")
    if (!props.buildParams?.command) throw new Error("command is requires in buildParams")
    fs.writeFileSync(path.join(serverOutput, 'run.sh'), props.buildParams.command)

    this.function = new lambda.Function(this, `AppFunction`, {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      handler: "run.sh",
      timeout: cdk.Duration.seconds(60),
      code: lambda.Code.fromAsset(serverOutput),
      loggingFormat: LoggingFormat.JSON,
      layers: [webAdapterLayer],
      environment,
    });
  }

  cloudfront(path: string) {
    const webUrl = this.function.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    const serverOrigin = new cloudfrontOrigin.FunctionUrlOrigin(webUrl);
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

    const appBehaviour: cloudfront.BehaviorOptions = {
      origin: serverOrigin,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      compress: true,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      originRequestPolicy:
        cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      responseHeadersPolicy:
        cloudfront.ResponseHeadersPolicy
          .CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS,
    };

    return {
      [`${path}/*`]: appBehaviour,
      [`${path}/_next/image/*`]: appBehaviour,
      [`${path}/_next/*`]: staticBehavior,
      [`${path}/*.ico`]: staticBehavior,
    };
  }

  api(path: string): Record<string, HttpRouteIntegration> {
    throw new Error('api not supported for this construct');
  }

  attach(attachable: Record<string, Attachable>) {
    return lambdaAttach(this.function, attachable);
  }

  grant(...grants: Grantable[]) {
    return lambdaGrant(this.function, grants);
  }

  subscription(): ITopicSubscription {
    throw new Error(`subscription not supported for ${this}`);
  }
}
