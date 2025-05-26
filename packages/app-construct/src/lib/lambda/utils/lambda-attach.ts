import { Attachable } from '@fy-stack/types';
import { Function } from 'aws-cdk-lib/aws-lambda';

import { paramsFromAttachable } from '../../util/params-from-attachable';

export function lambdaAttach(func: Function, attachable: Record<string, Attachable>) {
  const params: Record<string, string> = {}
  Object.assign( params, ...paramsFromAttachable(attachable))

  for (const i in params) {
    func.addEnvironment(i, params[i])
  }
}