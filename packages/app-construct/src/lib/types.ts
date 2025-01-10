import type { ApiResource, Attach, CDNResource, EventResource, Grant } from '@fy-stack/types';
import type { IVpc } from 'aws-cdk-lib/aws-ec2';
import type { Function } from 'aws-cdk-lib/aws-lambda';
import { Queue } from 'aws-cdk-lib/aws-sqs';

export type AppProperties<BuildParams = Record<string, unknown>> = {
  queue?: { batchSize?: number };
  env?: Record<string, string>;
  buildParams: BuildParams;
  output: string;
  vpc?: IVpc
};

export interface AppConstruct extends Attach, Grant, CDNResource, EventResource, ApiResource {
  function?: Function;
  queue?: Queue
}