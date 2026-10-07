import { Attachable, Grantable } from '@fy-stack/types';
import { Duration } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
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
  public tokenExpiration: { access: number; refresh: number };

  constructor(scope: Construct, id: string, props: AuthConstructProps) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      deletionProtection: true,
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      signInAliases: props.signInAliases,
    });

    let domainConfig:
      | {
          customDomain: cognito.CustomDomainOptions;
          zone: route53.IHostedZone;
        }
      | undefined = undefined;

    if (props.domain) {
      const customDomainName = [
        ['auth', ...(props.domainPrefix ?? [])].join('-'),
        this.parseDomain(props.domain.records, props.domain.domain),
      ].join('.');

      const zone = route53.HostedZone.fromLookup(this, 'AppZone', {
        domainName: props.domain.domain,
      });

      const certificate = new acm.Certificate(this, 'DomainCertificate', {
        domainName: customDomainName,
        validation: acm.CertificateValidation.fromDns(zone),
      });

      const customDomain = {
        certificate,
        domainName: customDomainName,
      };

      domainConfig = { customDomain, zone };
    }

    this.domain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
      userPool: this.userPool,
      ...(domainConfig
        ? { customDomain: domainConfig.customDomain }
        : {
            cognitoDomain: {
              domainPrefix: `${props.appName}-${props.environment}`,
            },
          }),
      managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    });

    if (domainConfig && props.domain) {
      const recordName = domainConfig.customDomain.domainName
        .split(props.domain.domain)[0]
        .replace(/\.+$/, '');

      new route53.ARecord(this, `UserPoolDomainRecord`, {
        recordName,
        zone: domainConfig.zone,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.UserPoolDomainTarget(this.domain)
        ),
      });
    }

    const accessTokenValidity = Duration.minutes(
      props.token?.accessTokenValidity ?? 30
    );

    const refreshTokenValidity = Duration.minutes(
      props.token?.refreshTokenValidity ?? 1440
    );

    this.tokenExpiration = {
      access: accessTokenValidity.toSeconds(),
      refresh: refreshTokenValidity.toSeconds(),
    };

    this.client = new cognito.UserPoolClient(this, 'WebClient', {
      userPool: this.userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
        adminUserPassword: true,
      },
      accessTokenValidity,
      enableTokenRevocation: true,
      refreshTokenValidity,
      generateSecret: true,
      ...(props.client ?? {}),
    });

    new cognito.CfnManagedLoginBranding(this, 'ManagedLoginStyle', {
      userPoolId: this.userPool.userPoolId,
      clientId: this.client.userPoolClientId,
      useCognitoProvidedValues: true,
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
      DOMAIN_NAME: this.domain.baseUrl(),
      ACCESS_TOKEN_EXPIRATION: this.tokenExpiration.access.toString(),
      REFRESH_TOKEN_EXPIRATION: this.tokenExpiration.refresh.toString(),
    };
  }

  grantable(grant: iam.IGrantable) {
    this.userPool.grant(grant, 'cognito-idp:*', 'cognito-identity:*');
  }

  private parseDomain(records: string[], domain: string) {
    if (!records.length || records.includes('*')) return domain;
    else return `${records[0]}.${domain}`;
  }
}
