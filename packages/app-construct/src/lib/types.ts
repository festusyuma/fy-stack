import type { BehaviorOptions } from 'aws-cdk-lib/aws-cloudfront';
import type { IRole } from 'aws-cdk-lib/aws-iam';
import type { Function } from 'aws-cdk-lib/aws-lambda';
import { Queue } from 'aws-cdk-lib/aws-sqs';

export type AppProperties = {
  queue?: { batchSize?: number };
  role?: IRole;
  env?: Record<string, string>;
  buildPaths: Record<string, string>;
  output: string;
};

export interface AppConstruct {
  function: Function;
  queue?: Queue
  cloudfront(path: string): Record<string, BehaviorOptions>
}