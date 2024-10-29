import * as cdk from 'aws-cdk-lib';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

import type { SecretConstructProps } from './type';

export class SecretsConstruct extends cdk.NestedStack {
  public readonly secrets: secretsManager.Secret;

  constructor(scope: Construct, id: string, props: SecretConstructProps) {
    super(scope, id);
    const secretObjectValue: Record<string, string> = {
      region: cdk.Stack.of(this).region,
    };

    Object.assign(
      secretObjectValue,
      ...Object.entries(props.resources ?? {})
        .map(([key, val]) => {
          return Object.fromEntries(
            Object.entries(val?.secrets() ?? {})
              .map(([subKey, subVal]) => [`${key}.${subKey}`, subVal])
          )
        })
    )

    if (props.secrets) {
      Object.assign(
        secretObjectValue,
        props.secrets,
      );
    }

    this.secrets = new secretsManager.Secret(this, 'AppSecrets', {
      secretObjectValue: Object.fromEntries(
        Object.entries(secretObjectValue).map(([key, val]) => [
          key,
          cdk.SecretValue.unsafePlainText(val ?? ''),
        ])
      ),
    });

    for (const i in props.apps) {
      const app = props.apps[i];
      if (!app) continue;

      app.function.addEnvironment('APP_SECRETS', this.secrets.secretName);
      this.secrets.grantRead(app.function);
    }
  }
}
