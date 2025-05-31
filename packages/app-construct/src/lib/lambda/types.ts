import {
  type ApiResource,
  AppType,
  type Attach,
  type CDNResource,
  type EventResource,
  type Grant,
} from '@fy-stack/types';
import type { IVpc } from 'aws-cdk-lib/aws-ec2';
import type { Function } from 'aws-cdk-lib/aws-lambda';
import { Queue } from 'aws-cdk-lib/aws-sqs';

export type LambdaConstructProps = {
  vpc?: IVpc;
  apps: Record<string, App>;
};

export interface AppConstruct
  extends Attach,
    Grant,
    CDNResource,
    EventResource,
    ApiResource {
  function: Function;
  queue?: Queue;
}

export type App = {
  type:
    | typeof AppType.IMAGE_APP
    | typeof AppType.NEXT_APP_ROUTER
    | typeof AppType.NODE_APP
    | typeof AppType.NODE_API;
  output: string;
  env?: Record<string, string>;
  queue?: { batchSize?: number };
  buildParams?: Record<string, unknown>;
};

export type AppProperties<BuildParams = Record<string, unknown>> = {
  queue?: { batchSize?: number };
  env?: Record<string, string>;
  timeout?: number;
  buildParams: BuildParams;
  output: string;
  vpc?: IVpc;
};
