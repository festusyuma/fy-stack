import { Attachable } from '@fy-stack/types';
import { DatabaseInstance, DatabaseSecret } from 'aws-cdk-lib/aws-rds';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

type Props = {
  db: DatabaseInstance;
  masterSecret: ISecret;
  username: string;
  dbName: string;
};

export class DatabaseUserConstruct extends Construct implements Attachable {
  public secrets: ISecret;
  public dbName: string;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    this.dbName = props.dbName;

    this.secrets = new DatabaseSecret(this, 'Secret', {
      username: props.username,
      masterSecret: props.masterSecret,
    });

    this.secrets.attach(props.db);
    // todo create rds user with create db permissions
  }

  attachable(): Record<string, string> {
    return {
      DB_NAME: this.dbName,
      SECRET_ARN: this.secrets.secretArn,
      SECRET_NAME: this.secrets.secretName,
    }
  }
}
