import * as fs from 'node:fs';

import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigin from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import { AppConstruct, AppProperties } from './types';

export class NextAppRouterConstruct extends Construct implements AppConstruct {
  public function: lambda.Function;
  public queue: sqs.Queue | undefined;

  private readonly static: s3.Bucket;

  constructor(scope: Construct, id: string, props: AppProperties) {
    super(scope, id);

    const region = cdk.Stack.of(this).region;

    const { serverOutput, staticOutput, staticPath } = props.buildPaths;
    if (!serverOutput || !staticOutput) throw new Error('assets not found');

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
      sources: [s3Deploy.Source.asset(staticOutput)],
      destinationKeyPrefix: staticPath,
      retainOnDelete: false,
      prune: true,
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

    let role: iam.IRole | undefined;
    if (props.role?.roleArn) {
      role = iam.Role.fromRoleArn(this, 'AppRole', props.role?.roleArn);
    }

    this.function = new lambda.Function(this, `AppFunction`, {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      handler: 'run.sh',
      role,
      timeout: cdk.Duration.seconds(60),
      code: lambda.Code.fromAsset(serverOutput),
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

  static clean(output: string, name: string, command: string) {
    const destination = `./dist/${name}`;

    /* Delete previous cleaned files */
    fs.rmSync(destination, { recursive: true, force: true });

    /* Create server and static folders for deployment */
    fs.mkdirSync(`${destination}/server`, { recursive: true });
    fs.mkdirSync(`${destination}/static/_next`, { recursive: true });

    fs.cpSync(`${output}/.next/standalone/`, `${destination}/server`, {
      recursive: true,
    });

    /* Copy public files to static folder */
    fs.cpSync(`${output}/public`, `${destination}/static`, {
      recursive: true,
    });

    /* Copy static files to next static folder */
    fs.cpSync(`${output}/.next/static`, `${destination}/static/_next/static`, {
      recursive: true,
    });

    fs.writeFileSync(`${destination}/server/run.sh`, command);

    return {
      serverOutput: `${destination}/server`,
      staticOutput: `${destination}/static`,
      staticPath: '',
    };
  }
}
