import { Duration } from 'aws-cdk-lib';

import { AppProperties } from '../types';

export function getDefaultLambda(props: AppProperties<unknown>) {
  return {
    memorySize: 512,
    timeout: Duration.seconds(props.timeout ?? 30),
    environment: props.env,
  };
}
