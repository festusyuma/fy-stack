import * as fs from 'node:fs';
import * as path from 'node:path';

import { Attachable, Grantable } from '@fy-stack/types';
import * as cdk from 'aws-cdk-lib';
import type { HttpRouteIntegration } from 'aws-cdk-lib/aws-apigatewayv2';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigin from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { InvokeMode } from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { ITopicSubscription } from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { z } from 'zod';

import {
  AppFile,
  cloudfrontBehaviours,
  staticDeployment,
} from '../../shared/next-app-router';
import { AppConstruct, AppProperties } from '../types';
import { getDefaultLambda } from '../utils/getDefaultLambda';
import { lambdaAttach } from '../utils/lambda-attach';
import { lambdaGrant } from '../utils/lambda-grant';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import { HttpUrlIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

const BuildParamsSchema = z.object({ cmd: z.string() }).passthrough();

export class NextAppRouterConstruct extends Construct implements AppConstruct {
  public function: lambda.Function;
  public queue: sqs.Queue | undefined;

  private readonly static: s3.Bucket;
  private readonly files: AppFile;

  constructor(
    scope: Construct,
    id: string,
    props: AppProperties<z.infer<typeof BuildParamsSchema>>
  ) {
    super(scope, id);

    const region = cdk.Stack.of(this).region;
    const deployment = staticDeployment(this, props.output);

    this.static = deployment.staticBucket;
    this.files = deployment.files;

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
    const serverOutput = path.join(props.output, '/.next/standalone');

    fs.writeFileSync(path.join(serverOutput, 'run.sh'), cmd);

    const defaultProps = getDefaultLambda(this, props);

    this.function = new lambda.Function(this, `AppFunction`, {
      ...defaultProps,
      environment: Object.assign({}, defaultProps.environment, environment),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'run.sh',
      code: lambda.Code.fromAsset(serverOutput),
      layers: [webAdapterLayer],
      ...functionProps,
    });
  }

  cloudfront(path: string): Record<string, cloudfront.BehaviorOptions> {
    const webUrl = this.function.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    const serverOrigin = new cloudfrontOrigin.FunctionUrlOrigin(webUrl);

    return cloudfrontBehaviours(
      this,
      this.static,
      serverOrigin,
      path,
      this.files
    );
  }

  cloudfrontPolicy(distributionId: string) {
    throw new Error(`cloudfrontPolicy not supported for ${this}`);
  }

  api(basePath: string): Record<string, HttpRouteIntegration> {
    const strippedBasePath = basePath.replace(/^\/+|\/+$/g, '');

    const apiUrl = this.function.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: InvokeMode.RESPONSE_STREAM,
    });

    if (strippedBasePath) {
      new s3Deploy.BucketDeployment(
        this,
        `${strippedBasePath}StaticDeployment`,
        {
          destinationBucket: this.static,
          sources: [this.files.staticFiles],
          destinationKeyPrefix: `${strippedBasePath}/_next/static/`,
          retainOnDelete: false,
        }
      );

      new s3Deploy.BucketDeployment(
        this,
        `${strippedBasePath}PublicDeployment`,
        {
          destinationBucket: this.static,
          sources: [this.files.publicFiles],
          destinationKeyPrefix: `${strippedBasePath}/`,
          retainOnDelete: false,
        }
      );

      this.function.addEnvironment('BASE_PATH', basePath);
    }

    const imageIntegration = new HttpUrlIntegration(
      'AppImageIntegration',
      apiUrl.url + path.join(strippedBasePath, '_next/image', '{proxy}')
    );

    const staticIntegration = new HttpUrlIntegration(
      'AppStaticIntegration',
      this.static.bucketWebsiteUrl +
        path.join(strippedBasePath, '/_next', '{proxy}')
    );

    const publicIntegration = new HttpUrlIntegration(
      'AppPublicIntegration',
      this.static.bucketWebsiteUrl +
        path.join(strippedBasePath, '/public', '{proxy}')
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
