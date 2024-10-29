import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';


export class DatabaseConstruct extends Construct {
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

    this.dbName = `${this.node.id}-db`

    const dbSecret = new rds.DatabaseSecret(this, 'DatabaseSecret', {
      username: this.node.id,
      dbname: this.dbName,
    });

    dbSecret.attach(db);

    this.db = db;
    this.dbSecrets = dbSecret;
  }

  secrets() {
    return {
      arn: this.db.clusterArn,
      name: this.dbName,
      secrets: this.dbSecrets.secretArn
    }
  }
}
