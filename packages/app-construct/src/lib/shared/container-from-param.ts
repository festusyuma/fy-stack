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
      `RepositoryNameV${version}`,
      `/${reference}/${version}/repository`
    ).stringValue,
    tag: ssm.StringParameter.fromStringParameterName(
      scope,
      `VersionNumberV${version}`,
      `/${reference}/${version}/tag`
    ).stringValue,
    cmd: ssm.StringParameter.fromStringParameterName(
      scope,
      `ImageCMDV${version}`,
      `/${reference}/${version}/cmd`
    ).stringValue,
  };
}
