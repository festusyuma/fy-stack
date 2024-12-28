import {  Attachable, Grantable } from '@fy-stack/types';
import { Duration } from 'aws-cdk-lib';
import type { HttpRouteIntegration } from 'aws-cdk-lib/aws-apigatewayv2';
import {
  AllowedMethods,
  BehaviorOptions,
  CachePolicy,
  OriginRequestPolicy,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { FunctionUrlOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import {
  Code,
  Function,
  FunctionUrlAuthType,
  Handler,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { ITopicSubscription, SubscriptionProps } from 'aws-cdk-lib/aws-sns';
import {
  LambdaSubscription,
  SqsSubscription,
} from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { z } from 'zod';

import { AppConstruct, AppProperties } from './types';
import { lambdaApi } from './utils/lambda-api';
import { lambdaAttach } from './utils/lambda-attach';
import { lambdaGrant } from './utils/lambda-grant';

const BuildParamsSchema = z.object({
  file: z.string().optional(),
  cmd: z.string().array().optional(),
})

export class ImageAppConstruct
  extends Construct
  implements AppConstruct
{
  public function: Function;
  public queue: Queue | undefined;

  constructor(scope: Construct, id: string, props: AppProperties<z.infer<typeof BuildParamsSchema>>) {
    super(scope, id);

    this.function = new Function(this, `AppFunction`, {
      memorySize: 512,
      timeout: Duration.seconds(30),
      code: Code.fromAssetImage(props.output, {
        file: props.buildParams.file,
        platform: Platform.LINUX_AMD64,
        cmd: props.buildParams.cmd,
      }),
      environment: props.env,
      handler: Handler.FROM_IMAGE,
      runtime: Runtime.FROM_IMAGE,
    });

    if (props.queue) {
      this.queue = new Queue(this, 'AppQueue', {
        visibilityTimeout: Duration.seconds(59),
      });

      this.function.addEventSource(
        new SqsEventSource(this.queue, {
          batchSize: props.queue.batchSize,
        })
      );
    }
  }

  attach(attachable: Record<string, Attachable>): void {
    return lambdaAttach(this.function, attachable);
  }

  grant(...grantables: Grantable[]): void {
    return lambdaGrant(this.function, grantables);
  }

  subscription(props: SubscriptionProps): ITopicSubscription {
    if (this.queue) {
      return new SqsSubscription(this.queue, props);
    }

    return new LambdaSubscription(this.function, props);
  }

  cloudfront(path: string): Record<string, BehaviorOptions> {
    this.function.addEnvironment('BASE_PATH', path);

    const apiUrl = this.function.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
    });

    const apiBehavior = {
      origin: new FunctionUrlOrigin(apiUrl),
      cachePolicy: CachePolicy.CACHING_DISABLED,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      compress: true,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      responseHeadersPolicy:
      ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS,
    };

    return { [`${path}/*`]: apiBehavior };
  }

  cloudfrontPolicy(distributionId: string) {
    throw new Error("cloudfrontPolicy not implemented");
  }

  api(path: string): Record<string, HttpRouteIntegration> {
    return lambdaApi(this.function, path)
  }

  static parse(params: unknown) {
    return BuildParamsSchema.parse(params)
  }
}
