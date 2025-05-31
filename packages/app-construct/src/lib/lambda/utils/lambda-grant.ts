import { Grantable } from '@fy-stack/types';
import { Function } from 'aws-cdk-lib/aws-lambda';

export function lambdaGrant(func: Function, grants: Grantable[]) {
  for (const i in grants) {
    grants[i].grantable(func)
  }
}