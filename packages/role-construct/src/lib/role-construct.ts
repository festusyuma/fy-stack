import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

import {  RoleConstructProps } from './types';

export class RoleConstruct extends Construct {
  public readonly role: iam.Role | undefined;

  constructor(scope: Construct, id: string, props: RoleConstructProps) {
    super(scope, id);

    const lambdaManagedPolicy = iam.ManagedPolicy.fromManagedPolicyArn(
      this,
      'LambdaManagedPolicy',
      'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
    );

    const statements: iam.PolicyStatement[] = [];

    if (props.capabilities?.auth && props.resources?.auth) {
      statements.push(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['cognito-idp:*', 'cognito-identity:*'],
          resources: [props.resources.auth],
        })
      );
    }

    if (props.capabilities?.storage && props.resources?.storage) {
      statements.push(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:*'],
          // resources: [`${props.storage.bucket.bucketArn}/*`],
          resources: [props.resources.storage],
        })
      );
    }

    if (props.capabilities?.database && props.resources?.database) {
      statements.push(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['rds-data:*'],
          resources: [props.resources.database.db],
          // resources: [props.database.db.clusterArn],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['secretsmanager:GetSecretValue'],
          resources: [props.resources.database.secret],
          // resources: [props.database.secrets.secretArn],
        })
      );
    }

    if (statements.length) {
      this.role = new iam.Role(this, 'Role', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [lambdaManagedPolicy],
        inlinePolicies: {
          basePolicy: new iam.PolicyDocument({ statements }),
        },
      });
    }
  }
}
