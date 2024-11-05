import { Attachable, Grantable } from '@fy-stack/types';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSource from 'aws-cdk-lib/aws-lambda-event-sources';
import { ITopicSubscription, SubscriptionProps } from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import { AppConstruct, AppProperties } from './types';
import { lambdaAttach } from './utils/lambda-attach';
import { lambdaGrant } from './utils/lambda-grant';
import { BehaviorOptions } from 'aws-cdk-lib/aws-cloudfront';
import type { HttpRouteIntegration } from 'aws-cdk-lib/aws-apigatewayv2';

export class NodeAppConstruct extends Construct implements AppConstruct {
  public function: lambda.Function;
  public queue: sqs.Queue | undefined;

  constructor(scope: Construct, id: string, props: AppProperties) {
    super(scope, id);

    const environment = {};

    Object.assign(environment, props.env);

    this.function = new lambda.Function(this, `AppFunction`, {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      handler: props.buildParams?.handler ?? "index.handler",
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset(props.output),
      loggingFormat: LoggingFormat.JSON,
      environment,
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
    if (this.queue)
      return new snsSubscriptions.SqsSubscription(this.queue, props);

    return new snsSubscriptions.LambdaSubscription(this.function, props);
  }

  cloudfront(path: string): Record<string, BehaviorOptions> {
    throw new Error(`cloudfront not supported for ${this}`)
  }

  api(path: string): Record<string, HttpRouteIntegration> {
    throw new Error(`api not supported for ${this}`)
  }
}
