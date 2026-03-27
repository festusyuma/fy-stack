import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export function containerParamsFromSSM(scope: Construct, reference: string) {
  return {
    repository: ssm.StringParameter.fromStringParameterName(
      scope,
      'RepositoryName',
      `/${reference}/repository`
    ).stringValue,
    tag: ssm.StringParameter.fromStringParameterName(
      scope,
      'VersionNumber',
      `/${reference}/tag`
    ).stringValue,
    cmd: ssm.StringListParameter.fromStringListParameterName(
      scope,
      'ImageCMD',
      `/${reference}/cmd`
    ).stringListValue,
  };
}
