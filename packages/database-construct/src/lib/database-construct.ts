import type { Attachable, Grantable } from '@fy-stack/types';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { IGrantable } from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import { DatabaseInstanceEngine } from 'aws-cdk-lib/aws-rds';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

import { DatabaseConstructProps } from './types';

/**
 * Represents a database construct that provisions an RDS database instance along with associated secrets.
 * It implements both {@link Attachable `Attachable`} and {@link Grantable `Grantable`} interfaces.
 */
export class DatabaseConstruct
  extends Construct
  implements Attachable, Grantable
{
  public dbSecrets: secretsManager.ISecret;
  public db: rds.DatabaseInstance;
  public dbName: string;

  constructor(scope: Construct, id: string, props?: DatabaseConstructProps) {
    super(scope, id);

    this.dbName = `${this.node.id}-db`;

    const vpc = ec2.Vpc.fromLookup(
      this,
      'VPC',
      props?.vpcId ? { vpcId: props.vpcId } : { isDefault: true }
    );

    const credentials = rds.Credentials.fromGeneratedSecret(
      `${this.dbName}-user`,
      {}
    );
    if (!credentials.secret)
      throw new Error('Could not create database credentials');

    this.dbSecrets = credentials.secret;

    this.db = new rds.DatabaseInstance(this, 'DB', {
      vpc,
      engine: props?.engine ?? DatabaseInstanceEngine.POSTGRES,
      instanceType: ec2.InstanceType.of(
        props?.instance?.class ?? ec2.InstanceClass.T3,
        props?.instance?.size ?? ec2.InstanceSize.NANO
      ),
      publiclyAccessible: props?.public,
      databaseName: this.dbName,
      credentials,
      ...(props?.additionalData ?? {}),
    });
  }

  grantable(grant: IGrantable) {
    this.db.grantConnect(grant);

    grant.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [this.dbSecrets.secretArn],
      })
    );
  }

  attachable() {
    return {
      arn: this.db.instanceArn,
      name: this.dbName,
      secretsArn: this.dbSecrets.secretArn,
      secretsName: this.dbSecrets.secretName,
    };
  }
}
