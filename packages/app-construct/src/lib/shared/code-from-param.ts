import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export function codeFromSSM(
  scope: Construct,
  reference: string,
  version = 'latest'
) {
  return {
    code: ssm.StringParameter.fromStringParameterName(
      scope,
      'CodeFilesKeyParam',
      `/${reference}/${version}/code`
    ).stringValue,
    cmd: ssm.StringParameter.fromStringParameterName(
      scope,
      'CodeCMDParam',
      `/${reference}/${version}/code/handler`
    ).stringValue,
  };
}
