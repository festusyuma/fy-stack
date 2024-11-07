import { Attachable, Grantable } from '@fy-stack/types';
import * as cdk from 'aws-cdk-lib';
import { IGrantable } from 'aws-cdk-lib/aws-iam';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

import type { SecretConstructProps } from './type';

/**
 * A construct that manages and encapsulates AWS Secrets Manager secrets.
 * This construct implements the {@link Attachable `Attachable`} and {@link Grantable `Grantable`} interfaces.
 */
export class SecretsConstruct extends Construct implements Attachable, Grantable {
  public readonly secrets: secretsManager.Secret;

  constructor(scope: Construct, id: string, props: SecretConstructProps) {
    super(scope, id);
    const secretObjectValue: Record<string, string> = {
      region: cdk.Stack.of(this).region,
    };

    Object.assign(
      secretObjectValue,
      ...Object.entries(props.resources ?? {}).map(([key, val]) => {
        return Object.fromEntries(
          Object.entries(val?.attachable() ?? {}).map(([subKey, subVal]) => [
            `${key}.${subKey}`,
            subVal,
          ])
        );
      })
    );

    if (props.secrets) {
      Object.assign(secretObjectValue, props.secrets);
    }

    this.secrets = new secretsManager.Secret(this, 'AppSecrets', {
      secretObjectValue: Object.fromEntries(
        Object.entries(secretObjectValue).map(([key, val]) => [
          key,
          cdk.SecretValue.unsafePlainText(val ?? ''),
        ])
      ),
    });
  }

  attachable() {
    return {
      arn: this.secrets.secretArn,
      name: this.secrets.secretName,
    };
  }

  grantable(grant: IGrantable) {
    this.secrets.grantRead(grant);
  }
}
