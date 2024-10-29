import { Attach, CDNResource, Event, Grant } from '@fy-stack/types';
import type { Function } from 'aws-cdk-lib/aws-lambda';
import { Queue } from 'aws-cdk-lib/aws-sqs';

export type AppProperties = {
  queue?: { batchSize?: number };
  env?: Record<string, string>;
  buildPaths: Record<string, string>;
  output: string;
};

export interface AppConstruct extends Attach, Grant, CDNResource, Event {
  function: Function;
  queue?: Queue
}