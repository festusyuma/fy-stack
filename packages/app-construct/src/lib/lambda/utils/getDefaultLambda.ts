import { Duration } from 'aws-cdk-lib';

import { AppProperties } from '../types';
import { FunctionProps, LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import type { Construct } from 'constructs';

export function getDefaultLambda(
  scope: Construct,
  props: AppProperties<unknown>
) {
  let params: Partial<FunctionProps> = {
    memorySize: 512,
    timeout: Duration.seconds(props.timeout ?? 30),
    environment: props.env,
  };

  if (props.logGroup) {
    params = Object.assign<Partial<FunctionProps>, Partial<FunctionProps>>(
      params,
      { logGroup: props.logGroup, loggingFormat: LoggingFormat.JSON }
    );
  }

  return params;
}
