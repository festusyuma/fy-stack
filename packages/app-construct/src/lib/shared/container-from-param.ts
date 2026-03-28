import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export function containerParamsFromSSM(
  scope: Construct,
  reference: string,
  version = 'latest'
) {
  return {
    repository: ssm.StringParameter.fromStringParameterName(
      scope,
      'RepositoryName',
      `/${reference}/${version}/repository`
    ).stringValue,
    tag: ssm.StringParameter.fromStringParameterName(
      scope,
      'VersionNumber',
      `/${reference}/${version}/tag`
    ).stringValue,
    cmd: ssm.StringListParameter.fromStringListParameterName(
      scope,
      'ImageCMD',
      `/${reference}/${version}/cmd`
    ).stringListValue,
  };
}
