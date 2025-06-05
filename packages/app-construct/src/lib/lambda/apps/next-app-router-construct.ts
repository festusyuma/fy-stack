import * as fs from 'node:fs';
import * as path from 'node:path';

import { Attachable, Grantable } from '@fy-stack/types';
import * as cdk from 'aws-cdk-lib';
import type { HttpRouteIntegration } from 'aws-cdk-lib/aws-apigatewayv2';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigin from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { ITopicSubscription } from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { z } from 'zod';

import {
  serverCloudfrontBehaviour,
  staticCloudfrontBehaviour,
  staticDeployment,
} from '../../shared/next-app-router';
import { AppConstruct, AppProperties } from '../types';
import { lambdaAttach } from '../utils/lambda-attach';
import { lambdaGrant } from '../utils/lambda-grant';

const BuildParamsSchema = z.object({
  cmd: z.string(),
});

export class NextAppRouterConstruct extends Construct implements AppConstruct {
  public function: lambda.Function;
  public queue: sqs.Queue | undefined;

  private readonly static: s3.Bucket;

  constructor(
    scope: Construct,
    id: string,
    props: AppProperties<z.infer<typeof BuildParamsSchema>>
  ) {
    super(scope, id);

    const region = cdk.Stack.of(this).region;
    this.static = staticDeployment(this, props.output);

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

    Object.assign(environment, props.env);

    const serverOutput = path.join(props.output, '/.next/standalone');
    fs.writeFileSync(path.join(serverOutput, 'run.sh'), props.buildParams.cmd);

    this.function = new lambda.Function(this, `AppFunction`, {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      handler: 'run.sh',
      timeout: cdk.Duration.seconds(60),
      code: lambda.Code.fromAsset(serverOutput),
      loggingFormat: lambda.LoggingFormat.JSON,
      layers: [webAdapterLayer],
      environment,
    });
  }

  cloudfront(path: string): Record<string, cloudfront.BehaviorOptions> {
    const webUrl = this.function.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    const serverOrigin = new cloudfrontOrigin.FunctionUrlOrigin(webUrl);

    return {
      ...serverCloudfrontBehaviour(this, serverOrigin, path),
      ...staticCloudfrontBehaviour(this.static, path),
    };
  }

  cloudfrontPolicy(distributionId: string) {
    throw new Error(`cloudfrontPolicy not supported for ${this}`);
  }

  api(): Record<string, HttpRouteIntegration> {
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

  static parse(params: unknown) {
    return BuildParamsSchema.parse(params);
  }
}
