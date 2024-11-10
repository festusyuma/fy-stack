import type { Attachable, Grantable } from '@fy-stack/types';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { IGrantable } from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import { DatabaseInstanceEngine } from 'aws-cdk-lib/aws-rds';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

import { DatabaseConstructProps } from './types';
import { DatabaseUserConstruct } from './database-user-construct';

/**
 * Represents a database construct that provisions an RDS database instance along with associated secrets.
 * It implements both {@link Attachable `Attachable`} and {@link Grantable `Grantable`} interfaces.
 */
export class DatabaseConstruct
  extends Construct
  implements Attachable, Grantable
{
  public secrets: secretsManager.ISecret;
  public db: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

    const vpc = ec2.Vpc.fromLookup(
      this,
      'VPC',
      props?.vpcId ? { vpcId: props.vpcId } : { isDefault: true }
    );

    this.db = new rds.DatabaseInstance(this, 'DB', {
      vpc,
      engine: props?.engine ?? DatabaseInstanceEngine.POSTGRES,
      instanceType: ec2.InstanceType.of(
        props?.instance?.class ?? ec2.InstanceClass.T4G,
        props?.instance?.size ?? ec2.InstanceSize.MICRO
      ),
      publiclyAccessible: props?.public,
      vpcSubnets: {
        subnetType: props?.public
          ? ec2.SubnetType.PUBLIC
          : ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    this.db.addRotationSingleUser()

    if (!this.db.secret)
      throw new Error('Could not create database credentials secret');

    this.secrets = this.db.secret;
  }

  grantable(grant: IGrantable) {
    this.db.grantConnect(grant);

    grant.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [this.secrets.secretArn],
      })
    );
  }

  attachable() {
    return {
      arn: this.db.instanceArn,
      secretsArn: this.secrets.secretArn,
      secretsName: this.secrets.secretName,
    };
  }

  createDatabase(username: string, dbName: string) {
    return new DatabaseUserConstruct(this, username + 'DatabaseUserStack', {
      username,
      dbName,
      db: this.db,
      masterSecret: this.secrets,
    });
  }
}
