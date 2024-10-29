import * as child_process from 'node:child_process';
import * as fs from 'node:fs';

import { Attachable, Grantable } from '@fy-stack/types';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigin from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSource from 'aws-cdk-lib/aws-lambda-event-sources';
import { ITopicSubscription, SubscriptionProps } from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import { AppConstruct, AppProperties } from './types';
import { lambdaAttach } from './utils/lambda-attach';
import { lambdaGrant } from './utils/lambda-grant';

interface Props extends AppProperties {
  webLayer?: boolean;
}

export class NestConstruct extends Construct implements AppConstruct {
  public function: lambda.Function;
  public queue: sqs.Queue | undefined;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const region = cdk.Stack.of(this).region;

    const { serverOutput } = props.buildPaths;
    if (!serverOutput) throw new Error('asset not found');

    const environment = {};

    Object.assign(environment, props.env);

    const layers: lambda.ILayerVersion[] = [];

    if (props.webLayer) {
      layers.push(
        lambda.LayerVersion.fromLayerVersionArn(
          this,
          'WebAdapterLayer',
          `arn:aws:lambda:${region}:753240598075:layer:LambdaAdapterLayerX86:16`
        )
      );

      Object.assign(environment, {
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        PORT: '8080',
      });
    }

    this.function = new lambda.Function(this, `AppFunction`, {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      handler: props.webLayer ? 'run.sh' : 'main.handler',
      layers,
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset(serverOutput),
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

  static clean(output: string, name: string, command: string) {
    const destination = `./dist/${name}`;

    /* Delete previous cleaned files */
    fs.rmSync(destination, { recursive: true, force: true });

    /* Create server and static folders for deployment */
    fs.mkdirSync(destination, { recursive: true });

    /* copy compiled code to be deployed to the server */
    fs.cpSync(output, destination, { recursive: true });

    console.log(
      child_process
        .execSync(`npm ci`, {
          stdio: 'pipe',
          cwd: destination,
        })
        .toString()
    );

    return { serverOutput: destination };
  }
}
