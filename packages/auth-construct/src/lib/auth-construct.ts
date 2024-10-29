import { Duration } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

import { AuthConstructProps } from './types';

export class AuthConstruct extends Construct {
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
      accessTokenValidity: Duration.hours(props.token?.accessTokenValidity ?? 24),
      refreshTokenValidity: Duration.hours(props.token?.refreshTokenValidity ?? 720),
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
}
