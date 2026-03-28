import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export function codeFromSSM(
  scope: Construct,
  reference: string,
  version = 'latest'
) {
  return {
    artifact: ssm.StringParameter.fromStringParameterName(
      scope,
      `CodeArtifactStorageParamV${version}`,
      `/${reference}/${version}/artifacts`
    ).stringValue,
    code: ssm.StringParameter.fromStringParameterName(
      scope,
      `CodeFilesKeyParamV${version}`,
      `/${reference}/${version}/code`
    ).stringValue,
    cmd: ssm.StringParameter.fromStringParameterName(
      scope,
      `CodeCMDParamV${version}`,
      `/${reference}/${version}/code/handler`
    ).stringValue,
  };
}
