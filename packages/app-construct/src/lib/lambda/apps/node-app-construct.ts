import { Attachable, Grantable } from '@fy-stack/types';
import { Duration } from 'aws-cdk-lib';
import type { HttpRouteIntegration } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { BehaviorOptions } from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { ITopicSubscription, SubscriptionProps } from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import { codeFromSSM } from '../../shared/code-from-param';
import { AppConstruct, AppProperties } from '../types';
import { getDefaultLambda } from '../utils/getDefaultLambda';
import { lambdaAttach } from '../utils/lambda-attach';
import { lambdaGrant } from '../utils/lambda-grant';

export class NodeAppConstruct extends Construct implements AppConstruct {
  public function: lambda.Function;
  public queue: sqs.Queue | undefined;

  constructor(scope: Construct, id: string, props: AppProperties) {
    super(scope, id);

    let code: lambda.Code;
    let handler: string;

    if ('reference' in props) {
      const params = codeFromSSM(this, props.reference, props.version);
      const artifactBucket = s3.Bucket.fromBucketName(
        this,
        'ArtifactBucket',
        params.artifact
      );
      code = lambda.Code.fromBucketV2(artifactBucket, params.code);
      handler = params.cmd;
    } else {
      code = lambda.Code.fromAsset(props.output);
      handler = props.buildParams.handler ?? 'index.handler';
    }

    this.function = new lambda.Function(this, `AppFunction`, {
      ...getDefaultLambda(props),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler,
      code,
    });

    if (props.queue) {
      const { batchSize, ...queueProps } = props.queue;

      this.queue = new Queue(this, 'AppQueue', {
        visibilityTimeout:
          queueProps.visibilityTimeout ??
          Duration.seconds((props.timeout ?? 30) + 30),
        ...queueProps,
      });

      this.function.addEventSource(
        new SqsEventSource(this.queue, {
          batchSize: batchSize,
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
      return new snsSubscriptions.SqsSubscription(this.queue, {
        ...props,
        rawMessageDelivery: true,
      });

    return new snsSubscriptions.LambdaSubscription(this.function, props);
  }

  cloudfront(path: string): Record<string, BehaviorOptions> {
    throw new Error(`cloudfront not supported for ${this}`);
  }

  cloudfrontPolicy(distributionId: string) {
    throw new Error(`cloudfrontPolicy not supported for ${this}`);
  }

  api(path: string): Record<string, HttpRouteIntegration> {
    this.function.addEnvironment('BASE_PATH', path);

    const integration = new HttpLambdaIntegration(
      'AppIntegration',
      this.function
    );

    return {
      [path]: integration,
      [`${path}/{proxy+}`]: integration,
    };
  }

  static parse<T>(params: T) {
    return params;
  }
}
