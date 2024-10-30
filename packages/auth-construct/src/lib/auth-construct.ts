import { Attachable, Grantable } from '@fy-stack/types';
import { Duration } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

import { AuthConstructProps } from './types';

export class AuthConstruct extends Construct implements Attachable, Grantable {
  public userPool: cognito.UserPool;
  public domain: cognito.UserPoolDomain;
  public client: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthConstructProps) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      deletionProtection: true,
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
    });

    this.domain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
      userPool: this.userPool,
      cognitoDomain: { domainPrefix: id.toLowerCase() },
    });

    this.client = new cognito.UserPoolClient(this, 'WebClient', {
      userPool: this.userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
        adminUserPassword: true,
      },
      accessTokenValidity: Duration.hours(
        props.token?.accessTokenValidity ?? 24
      ),
      refreshTokenValidity: Duration.hours(
        props.token?.refreshTokenValidity ?? 720
      ),
      generateSecret: true,
    });

    if (props.groups?.length) {
      for (const i in props.groups) {
        new cognito.CfnUserPoolGroup(this, `${props.groups[i]}Group`, {
          userPoolId: this.userPool.userPoolId,
          precedence: Number(i) + 1,
          groupName: props.groups[i],
        });
      }
    }
  }

  attachable() {
    return {
      arn: this?.userPool.userPoolArn,
      id: this?.userPool.userPoolId,
      domainName: this.domain.domainName,
      clientId: this?.client.userPoolClientId,
      clientSecret: this?.client.userPoolClientSecret.unsafeUnwrap(),
    };
  }

  grantable(grant: iam.IGrantable) {
    grant.grantPrincipal.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cognito-idp:*', 'cognito-identity:*'],
      resources: [this.userPool.userPoolArn],
    }))
  }
}
