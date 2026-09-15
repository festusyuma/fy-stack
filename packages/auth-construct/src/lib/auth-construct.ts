import { Attachable, Grantable } from '@fy-stack/types';
import { Duration } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

import { AuthConstructProps } from './types';

/**
 * AuthConstruct is a construct that sets up an authentication infrastructure
 * using Amazon Cognito. It creates a user pool, a domain for the user pool,
 * and a client for the user pool with configurable authentication flows and
 * token validity. Additionally, it can create user groups within the user pool.
 *
 * It extends the Construct class and implements the {@link Attachable `Attachable`} and {@link Grantable `Grantable`} interfaces.
 */
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
      signInAliases: props.signInAliases,
    });

    let customDomain: cognito.CustomDomainOptions | undefined = undefined;

    if (props.domain) {
      const customDomainName = `auth.${props.domain}`;

      const zone = route53.HostedZone.fromLookup(this, 'AppZone', {
        domainName: customDomainName,
      });

      const certificate = new acm.Certificate(this, 'DomainCertificate', {
        domainName: customDomainName,
        validation: acm.CertificateValidation.fromDns(zone),
      });

      customDomain = {
        certificate,
        domainName: customDomainName,
      };
    }

    this.domain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
      userPool: this.userPool,
      ...(customDomain
        ? { customDomain }
        : {
            cognitoDomain: {
              domainPrefix: `${props.appName}-${props.environment}`,
            },
          }),
      managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
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
      ARN: this?.userPool.userPoolArn,
      ID: this?.userPool.userPoolId,
      CLIENT_ID: this?.client.userPoolClientId,
      CLIENT_SECRET: this?.client.userPoolClientSecret.unsafeUnwrap(),
      DOMAIN_NAME: this.domain.domainName,
    };
  }

  grantable(grant: iam.IGrantable) {
    this.userPool.grant(grant, 'cognito-idp:*', 'cognito-identity:*');
  }
}
