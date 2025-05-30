import * as path from 'node:path';

import { ApiGatewayConstruct } from '@fy-stack/apigateway-construct';
import {
  EcsConstruct,
  LambdaConstruct,
  StaticConstruct,
} from '@fy-stack/app-construct';
import { AuthConstruct } from '@fy-stack/auth-construct';
import { CDNConstruct } from '@fy-stack/cdn-construct';
import { DatabaseConstruct } from '@fy-stack/database-construct';
import { EventConstruct } from '@fy-stack/event-construct';
import { SecretsConstruct } from '@fy-stack/secret-construct';
import { StorageConstruct } from '@fy-stack/storage-construct';
import { AppGrant, Attach, Grant, Grantable } from '@fy-stack/types';
import { CfnOutput, Stack, Tags } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

import { AppAttachment, FullStackConstructProps } from './types';

/**
 *
 */
export class FullStackConstruct extends Construct {
  public vpc: ec2.IVpc;
  public owner?: iam.IUser | iam.IRole;
  public auth?: AuthConstruct;
  public storage?: StorageConstruct;
  public storagePolicy?: string;
  public database?: DatabaseConstruct;
  public event?: EventConstruct;
  public ecs?: EcsConstruct;
  public lambda?: LambdaConstruct;
  public static?: StaticConstruct;
  public cdn?: CDNConstruct;
  public api?: ApiGatewayConstruct;
  public secret: SecretsConstruct;

  constructor(scope: Construct, id: string, props: FullStackConstructProps) {
    super(scope, id);

    this.owner = this.ownerFromArn(props.ownerArn);

    this.vpc = ec2.Vpc.fromLookup(
      this,
      'VPC',
      props.vpcId ? { vpcId: props.vpcId } : { isDefault: true }
    );

    if (props.auth) {
      this.auth = new AuthConstruct(this, 'AuthConstruct', {
        groups: props.auth.groups,
      });
    }

    if (props.storage) {
      this.storage = new StorageConstruct(
        this,
        'StorageConstruct',
        props.storage
      );
    }

    /* create secrets for test or production environments */
    if (props.database) {
      this.database = new DatabaseConstruct(this, 'DatabaseConstruct', {
        ...props.database,
        vpcId: this.vpc.vpcId,
      });
    }

    this.secret = new SecretsConstruct(this, 'SecretConstruct', {
      resources: {
        auth: this.auth,
        database: this.database,
        storage: this.storage,
        event: this.event,
      },
      secrets: {
        REGION: Stack.of(this).region,
        ENVIRONMENT: props.environment,
        ...props.secret,
      },
    });

    if (props.outputs) {
      new CfnOutput(this, 'SecretsName', {
        key: 'appSecrets',
        value: this.secret.secrets.secretName,
      });
    }

    if (props.ecs) {
      this.ecs = new EcsConstruct(this, 'EcsConstruct', {
        vpc: this.vpc,
        environmentPath: path.join('/', props.name, '/', props.environment),
        ...props.ecs,
      });

      if (this.ecs.server) {
        this.fromGrants(this.ecs.server, props.ecs.server?.grants);

        for (const i in this.ecs.server.apps) {
          if (!props.ecs.server?.apps[i].attachment) continue;

          this.fromAttachments(
            this.ecs.server.apps[i],
            props.ecs.server.apps[i].attachment
          );
        }
      }
    }

    if (props.lambda) {
      this.lambda = new LambdaConstruct(this, 'LambdaConstruct', {
        vpc: this.vpc,
        apps: props.lambda,
      });

      for (const i in this.lambda.apps) {
        if (props.lambda[i].attachment) {
          this.fromAttachments(this.lambda.apps[i], props.lambda[i].attachment);
        }

        if (props.lambda[i].grants) {
          this.fromGrants(this.lambda.apps[i], props.lambda[i].grants);
        }
      }
    }

    if (props.static) {
      this.static = new StaticConstruct(this, 'StaticConstruct', {
        apps: props.static,
      });
    }

    const resources = {
      ...(this.ecs?.server?.apps ?? {}),
      ...(this.lambda?.apps ?? {}),
      ...(this.static?.apps ?? {}),
    };

    if (props.event) {
      this.event = new EventConstruct(this, 'EventConstruct', {
        resources: this.lambda?.apps ?? {},
        ...props.event,
      });
    }

    if (props.cdn) {
      this.cdn = new CDNConstruct(this, 'CDNConstruct', {
        routes: props.cdn.routes,
        domains: props.cdn.domains,
        resources: {
          ...resources,
          storage: this.storage,
        },
      });

      if (props.outputs) {
        new CfnOutput(this, 'CDN Url', {
          key: 'cdnURl',
          value: 'https://' + this.cdn.distribution.domainName,
        });
      }
    }

    if (props.api) {
      this.api = new ApiGatewayConstruct(this, 'ApiConstruct', {
        routes: props.api.routes,
        resources,
      });

      if (this.api.api.url && props.outputs) {
        new CfnOutput(this, 'Api Url', {
          key: 'apiUrl',
          value: this.api.api.url,
        });
      }
    }

    if (this.storage && this.cdn) {
      this.storagePolicy = JSON.stringify(
        this.storage.cloudfrontPolicy(this.cdn.distribution.distributionId)
      );

      if (props.outputs) {
        new CfnOutput(this, 'StorageBucketCDNPolicy', {
          key: 'storageBucketCDNPolicy',
          value: this.storagePolicy,
        });
      }
    }

    Tags.of(this).add('App', props.name);
    Tags.of(this).add('Environment', props.environment);

    if (this.owner) {
      this.owner.addToPrincipalPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['*'],
          resources: ['*'],
          conditions: {
            StringEquals: {
              'aws:ResourceTag/App': props.name,
              'aws:ResourceTag/Environment': props.environment,
            },
          },
        })
      );

      if (this.storage) {
        this.storage.bucket.addToResourcePolicy(
          new iam.PolicyStatement({
            actions: ['*'],
            resources: [
              'arn:aws:s3:::' + this.storage.bucket.bucketName + '/*',
            ],
            principals: [this.owner],
          })
        );

        this.owner.addToPrincipalPolicy(
          new iam.PolicyStatement({
            actions: ['s3:*'],
            resources: [this.storage.bucket.bucketArn],
          })
        );
      }
    }
  }

  fromAttachments(attach: Attach, attachment?: AppAttachment) {
    const builtAttachment = Object.entries(attachment ?? {})
      .map(([key]) => [key, this[key as keyof this]])
      .filter((v) => !!v && !!v[1]);

    if (builtAttachment.length) {
      attach.attach(Object.fromEntries(builtAttachment));
    }
  }

  fromGrants(grant: Grant, grants?: AppGrant[]) {
    const builtGrants =
      (grants
        ?.map((val) => this[val as keyof this])
        .filter((v) => !!v) as Grantable[]) ?? [];

    if (builtGrants.length) {
      grant.grant(...builtGrants);
    }
  }

  ownerFromArn(ownerArn?: string) {
    if (!ownerArn) return;

    const [arn] = ownerArn.split('/');
    const resourceType = arn.split(':').at(-1);

    if (resourceType === 'user') {
      return iam.User.fromUserArn(this, 'Owner', ownerArn);
    }

    if (resourceType === 'role') {
      return iam.Role.fromRoleArn(this, 'Owner', ownerArn);
    }

    return;
  }
}
