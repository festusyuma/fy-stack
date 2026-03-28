import {
  type ApiResource,
  AppType,
  type Attach,
  type CDNResource,
  type EventResource,
  type Grant,
} from '@fy-stack/types';
import type { IVpc } from 'aws-cdk-lib/aws-ec2';
import type { Function, FunctionProps } from 'aws-cdk-lib/aws-lambda';
import type { ILogGroup } from 'aws-cdk-lib/aws-logs';
import type { Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';

export type LambdaConstructProps = {
  vpc?: IVpc | (() => IVpc);
  apps: Record<string, App>;
  logGroup: ILogGroup;
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
} & Omit<AppProperties, 'vpc' | 'logGroup'> &
  AppResource;

export type AppResource =
  | { output: string; cmd: string }
  | { reference: string; version?: string };

export type AppProperties<BuildParams = Record<string, unknown>> = {
  logGroup: ILogGroup;
  queue?: { batchSize?: number } & Partial<QueueProps>;
  env?: Record<string, string>;
  timeout?: number;
  buildParams: BuildParams & Partial<FunctionProps>;
  vpc?: IVpc | (() => IVpc);
} & AppResource;
