import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export function staticFilesFromSSM(
  scope: Construct,
  reference: string,
  version = 'latest'
) {
  return {
    artifact: ssm.StringParameter.fromStringParameterName(
      scope,
      `StaticArtifactStorageParamV${version}`,
      `/${reference}/${version}/artifacts`
    ).stringValue,
    filesKey: ssm.StringParameter.fromStringParameterName(
      scope,
      `StaticFilesKeyParamV${version}`,
      `/${reference}/${version}/files/key`
    ).stringValue,
  };
}
