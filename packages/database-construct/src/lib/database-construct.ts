import { Attachable, Grantable } from '@fy-stack/types';
import * as iam from 'aws-cdk-lib/aws-iam';
import { IGrantable } from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class DatabaseConstruct
  extends Construct
  implements Attachable, Grantable
{
  public dbSecrets: secretsManager.ISecret;
  public db: rds.IDatabaseCluster;
  public dbName: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const db = rds.DatabaseCluster.fromDatabaseClusterAttributes(
      this,
      'DatabaseCluster',
      { clusterIdentifier: 'dev-db-instance' }
    );

    this.dbName = `${this.node.id}-db`;

    const dbSecret = new rds.DatabaseSecret(this, 'DatabaseSecret', {
      username: this.node.id,
      dbname: this.dbName,
    });

    dbSecret.attach(db);

    this.db = db;
    this.dbSecrets = dbSecret;
  }

  grantable(grant: IGrantable) {
    const principals = [grant.grantPrincipal];

    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['rds-data:*'],
      resources: [this.db.clusterArn],
      principals,
    });

    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [this.dbSecrets.secretArn],
      principals,
    });
  }

  attachable() {
    return {
      arn: this.db.clusterArn,
      name: this.dbName,
      secretsArn: this.dbSecrets.secretArn,
      secretsName: this.dbSecrets.secretName,
    };
  }
}
