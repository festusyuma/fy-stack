import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import type { Construct } from 'constructs';

export function deployThenPrune(
  scope: Construct,
  id: string,
  props: Omit<s3Deploy.BucketDeploymentProps, 'prune'>
) {
  const deployment = new s3Deploy.BucketDeployment(scope, id, {
    ...props,
    prune: false,
  });

  const prune = new s3Deploy.BucketDeployment(scope, `${id}Prune`, {
    ...props,
    prune: true,
  });

  prune.node.addDependency(deployment);

  return { deployment, prune };
}
