import * as fs from 'node:fs';
import * as path from 'node:path';

import { Attachable, Grantable } from '@fy-stack/types';
import * as cdk from 'aws-cdk-lib';
import type { HttpRouteIntegration } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpUrlIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigin from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { ITopicSubscription } from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { z } from 'zod';

import { codeFromSSM } from '../../shared/code-from-param';
import {
  AppFile,
  appFilesDeployment,
  cloudfrontBehaviours,
  createImageCachePolicy,
  filesFromSSM,
  staticDeployment,
} from '../../shared/next-app-router';
import { publicBucket } from '../../shared/public-bucket';
import { AppConstruct, AppProperties } from '../types';
import { getDefaultLambda } from '../utils/getDefaultLambda';
import { lambdaAttach } from '../utils/lambda-attach';
import { lambdaGrant } from '../utils/lambda-grant';

const BuildParamsSchema = z.looseObject({ cmd: z.string().optional() });

export class NextAppRouterConstruct extends Construct implements AppConstruct {
  public function: lambda.Function;
  public queue: sqs.Queue | undefined;

  private readonly static: s3.Bucket;
  private readonly files: AppFile;
  private url?: lambda.FunctionUrl;
  private imagePolicy?: cloudfront.ICachePolicy;

  constructor(
    scope: Construct,
    id: string,
    props: AppProperties<z.infer<typeof BuildParamsSchema>>
  ) {
    super(scope, id);

    const region = cdk.Stack.of(this).region;

    this.static = publicBucket(this, 'StaticBucket');
    const artifactBucket = new s3.Bucket(this, 'ArtifactStorage', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const webAdapterLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'WebAdapterLayer',
      `arn:aws:lambda:${region}:753240598075:layer:LambdaAdapterLayerX86:25`
    );

    const environment = {
      AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
      PORT: '8080',
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      AWS_LWA_INVOKE_MODE: 'response_stream',
    };

    const { cmd, ...functionProps } = props.buildParams;
    const defaultProps = getDefaultLambda(props);

    let handler;
    let code;

    if ('output' in props) {
      const deployment = staticDeployment(this, artifactBucket, props.output);
      this.files = { artifactBucket, ...deployment.files };
      const serverOutput = path.join(props.output, '/.next/standalone');

      if (!cmd) throw new Error('cmd is required when building from local');
      fs.writeFileSync(path.join(serverOutput, 'run.sh'), cmd);

      handler = 'run.sh';
      code = lambda.Code.fromAsset(serverOutput);
    } else {
      const fileParams = filesFromSSM(this, props.reference, props.version);
      const appArtifact = s3.Bucket.fromBucketName(
        this,
        'AppArtifactStorage',
        fileParams.artifact
      );

      this.files = { ...fileParams, artifactBucket: appArtifact };
      const cmdParams = codeFromSSM(this, props.reference, props.version);

      handler = cmdParams.cmd;
      code = lambda.Code.fromBucketV2(appArtifact, cmdParams.code);
    }

    this.function = new lambda.Function(this, `AppFunction`, {
      ...defaultProps,
      environment: Object.assign({}, defaultProps.environment, environment),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler,
      code,
      layers: [webAdapterLayer],
      ...functionProps,
    });

    const { deployments, prunes } = appFilesDeployment(
      this,
      this.static,
      this.files
    );

    this.function.node.addDependency(...deployments);
    for (const prune of prunes) prune.node.addDependency(this.function);
  }

  cloudfront(path: string): Record<string, cloudfront.BehaviorOptions> {
    const serverOrigin = new cloudfrontOrigin.FunctionUrlOrigin(
      this.functionUrl()
    );

    return cloudfrontBehaviours(
      this,
      this.static,
      serverOrigin,
      this.imageCachePolicy(),
      path,
      true
    );
  }

  cloudfrontPolicy() {
    throw new Error(`cloudfrontPolicy not supported for ${this}`);
  }

  api(basePath: string): Record<string, HttpRouteIntegration> {
    const strippedBasePath = basePath.replace(/^\/+|\/+$/g, '');

    const apiUrl = this.functionUrl();

    if (strippedBasePath) this.function.addEnvironment('BASE_PATH', basePath);

    const imageIntegration = new HttpUrlIntegration(
      'AppImageIntegration',
      apiUrl.url + path.join(strippedBasePath, '_next/image', '{proxy}')
    );

    const staticIntegration = new HttpUrlIntegration(
      'AppStaticIntegration',
      this.static.bucketWebsiteUrl + '/_next/{proxy}'
    );

    const publicIntegration = new HttpUrlIntegration(
      'AppPublicIntegration',
      this.static.bucketWebsiteUrl + '/{proxy}'
    );

    const wildcardIntegration = new HttpUrlIntegration(
      'AppWildcardIntegration',
      apiUrl.url + path.join(strippedBasePath, '{proxy}')
    );

    const defaultIntegration = new HttpUrlIntegration(
      'AppIntegration',
      apiUrl.url + strippedBasePath
    );

    return {
      [`${basePath}/_next/image/{proxy+}`]: imageIntegration,
      [`${basePath}/_next/{proxy+}`]: staticIntegration,
      [`${basePath}/public/{proxy+}`]: publicIntegration,
      [`${basePath}/{proxy+}`]: wildcardIntegration,
      [basePath]: defaultIntegration,
    };
  }

  private imageCachePolicy() {
    this.imagePolicy ??= createImageCachePolicy(this);
    return this.imagePolicy;
  }

  private functionUrl() {
    this.url ??= this.function.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    return this.url;
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

  static parse(params: unknown) {
    return BuildParamsSchema.parse(params);
  }
}
