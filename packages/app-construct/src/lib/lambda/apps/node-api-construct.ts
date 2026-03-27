import fs from 'node:fs';
import path from 'node:path';

import { Attachable, Grantable } from '@fy-stack/types';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigin from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSource from 'aws-cdk-lib/aws-lambda-event-sources';
import { ITopicSubscription, SubscriptionProps } from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import { AppConstruct, AppProperties } from '../types';
import { getDefaultLambda } from '../utils/getDefaultLambda';
import { lambdaApi } from '../utils/lambda-api';
import { lambdaAttach } from '../utils/lambda-attach';
import { lambdaGrant } from '../utils/lambda-grant';

export class NodeApiConstruct extends Construct implements AppConstruct {
  public function: lambda.Function;
  public queue: sqs.Queue | undefined;

  constructor(scope: Construct, id: string, props: AppProperties) {
    super(scope, id);

    if (!('output' in props)) {
      throw new Error('Output is required');
    }

    const region = cdk.Stack.of(this).region;
    const environment = {
      AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      PORT: '8080',
    };

    const layers: lambda.ILayerVersion[] = [
      lambda.LayerVersion.fromLayerVersionArn(
        this,
        'WebAdapterLayer',
        `arn:aws:lambda:${region}:753240598075:layer:LambdaAdapterLayerX86:16`
      ),
    ];

    const functionProps = props.buildParams;
    fs.writeFileSync(path.join(props.output, 'run.sh'), props.cmd);

    const defaultProps = getDefaultLambda(props);

    this.function = new lambda.Function(this, `AppFunction`, {
      ...defaultProps,
      environment: Object.assign({}, defaultProps.environment, environment),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'run.sh',
      code: lambda.Code.fromAsset(props.output),
      layers,
      ...functionProps,
    });

    if (props.queue) {
      this.queue = new sqs.Queue(this, 'AppQueue', {
        visibilityTimeout: cdk.Duration.seconds(59),
      });

      this.function.addEventSource(
        new lambdaEventSource.SqsEventSource(this.queue, {
          batchSize: props.queue.batchSize,
        })
      );
    }
  }

  attach(attachable: Record<string, Attachable>) {
    return lambdaAttach(this.function, attachable);
  }

  grant(...grants: Grantable[]) {
    return lambdaGrant(this.function, grants);
  }

  subscription(props: SubscriptionProps): ITopicSubscription {
    throw new Error(`subscription is not supported for ${this}`);
  }

  cloudfront(path: string) {
    const apiUrl = this.function.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    const apiBehavior = {
      origin: new cloudfrontOrigin.FunctionUrlOrigin(apiUrl),
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

    return { [`${path}/*`]: apiBehavior };
  }

  cloudfrontPolicy(distributionId: string) {
    throw new Error(`cloudfrontPolicy not supported for ${this}`);
  }

  api(path: string) {
    return lambdaApi(this.function, path);
  }

  static parse<T>(params: T) {
    return params;
  }
}
