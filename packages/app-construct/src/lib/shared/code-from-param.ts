import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export function codeFromSSM(scope: Construct, reference: string) {
  return {
    code: ssm.StringParameter.fromStringParameterName(
      scope,
      'CodeFilesKeyParam',
      `/${reference}/code`
    ).stringValue,
    cmd: ssm.StringParameter.fromStringParameterName(
      scope,
      'CodeCMDParam',
      `/${reference}/code/handler`
    ).stringValue,
  };
}
