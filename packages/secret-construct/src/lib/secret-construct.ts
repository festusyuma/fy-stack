import * as cdk from 'aws-cdk-lib';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

import type { SecretConstructProps } from './type';

export class SecretsConstruct extends cdk.NestedStack {
  public readonly secrets: secretsManager.Secret;

  constructor(scope: Construct, id: string, props: SecretConstructProps) {
    super(scope, id);
    const secretObjectValue: Record<string, cdk.SecretValue> = {
      region: cdk.SecretValue.unsafePlainText(cdk.Stack.of(this).region),
    };

    if (props.auth) {
      Object.assign(secretObjectValue, {
        userPoolArn: cdk.SecretValue.unsafePlainText(props.auth?.userPool.userPoolArn),
        userPoolId: cdk.SecretValue.unsafePlainText(props.auth?.userPool.userPoolId),
        userPoolDomain: cdk.SecretValue.unsafePlainText(
          props.auth.domain.domainName
        ),
        userPoolClientId: cdk.SecretValue.unsafePlainText(
          props.auth?.client.userPoolClientId
        ),
        userPoolClientSecret: props.auth?.client.userPoolClientSecret,
      });
    }

    if (props.event) {
      Object.assign(secretObjectValue, {
        topic: cdk.SecretValue.unsafePlainText(props.event.topic.topicArn),
      });
    }

    if (props.storage) {
      Object.assign(secretObjectValue, {
        bucketName: cdk.SecretValue.unsafePlainText(
          props.storage.bucket.bucketName
        ),
        bucketArn: cdk.SecretValue.unsafePlainText(
          props.storage.bucket.bucketArn
        ),
      });
    }

    if (props.secrets) {
      Object.assign(
        secretObjectValue,
        Object.fromEntries(
          Object.entries(props.secrets).map(([key, val]) => [
            key,
            cdk.SecretValue.unsafePlainText(val ?? ''),
          ])
        )
      );
    }

    if (props.database) {
      Object.assign(secretObjectValue, {
        databaseArn: cdk.SecretValue.unsafePlainText(props.database.db.clusterArn),
        databaseName: cdk.SecretValue.unsafePlainText(props.database.dbName),
        databaseSecrets: cdk.SecretValue.unsafePlainText(props.database.secrets.secretArn)
      })
    }

    this.secrets = new secretsManager.Secret(this, 'AppSecrets', {
      secretObjectValue,
    });

    for (const i in props.apps) {
      const app = props.apps[i];
      if (!app) continue;

      app.function.addEnvironment('APP_SECRETS', this.secrets.secretName);
      this.secrets.grantRead(app.function);

      if (props.database)
        app.function.addEnvironment(
          'DB_SECRETS',
          props.database.secrets.secretName
        );
    }
  }
}
