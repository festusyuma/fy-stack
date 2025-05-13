import { Attachable } from '@fy-stack/types';
import { Function } from 'aws-cdk-lib/aws-lambda';

export function lambdaAttach(func: Function, attachable: Record<string, Attachable>) {
  const params: Record<string, string> = {}
  Object.assign(
    params,
    ...Object.entries(attachable)
      .map(([key, val]) => {
        return Object.fromEntries(
          Object.entries(val?.attachable() ?? {})
            .map(([subKey, subVal]) => [`${key}_${subKey}`.toUpperCase(), subVal])
        )
      })
  )

  for (const i in params) {
    func.addEnvironment(i, params[i])
  }
}