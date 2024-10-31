import { ApiGatewayConstruct } from '@fy-stack/apigateway-construct';
import {
  type AppConstruct,
  NestApiConstruct,
  NestConstruct,
  NextAppRouterConstruct,
} from '@fy-stack/app-construct';
import { AuthConstruct } from '@fy-stack/auth-construct';
import { CDNConstruct } from '@fy-stack/cdn-construct';
import { DatabaseConstruct } from '@fy-stack/database-construct';
import { EventConstruct } from '@fy-stack/event-construct';
import { SecretsConstruct } from '@fy-stack/secret-construct';
import { StorageConstruct } from '@fy-stack/storage-construct';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { AppType, FullStackConstructProps } from './types';

const AppBuilds = {
  [AppType.NEXT_APP_ROUTER]: NextAppRouterConstruct,
  [AppType.NEST]: NestConstruct,
  [AppType.NEST_API]: NestApiConstruct,
};

export class FullStackConstruct extends Construct {
  public auth?: AuthConstruct;
  public storage?: StorageConstruct;
  public database?: DatabaseConstruct;
  public event?: EventConstruct;
  public apps?: Record<string, AppConstruct>;
  public cdn?: CDNConstruct;
  public api?: ApiGatewayConstruct;
  public secret: SecretsConstruct;

  constructor(scope: Construct, id: string, props: FullStackConstructProps) {
    super(scope, id);

    if (props.auth) {
      this.auth = new AuthConstruct(this, props.appId + 'AuthStack', {
        groups: props.auth.groups,
      });
    }

    if (props.storage) {
      this.storage = new StorageConstruct(this, 'StorageStack', props.storage);
    }

    /* create secrets for test or production environments */
    if (props.database) {
      this.database = new DatabaseConstruct(this, 'DatabaseStack');

      new cdk.CfnOutput(this, 'Database Secrets', {
        key: 'dbSecrets',
        value: this.database.dbSecrets.secretName,
      });
    }

    if (props.apps) {
      const apps: Record<string, AppConstruct> = {};

      Object.assign(
        apps,
        Object.fromEntries(
          Object.entries(props.apps).map(([key, app]) => {
            return [
              key,
              new AppBuilds[app.type](this, `${key}App`, {
                queue: app.attachment?.queue,
                output: app.output,
                buildPaths: AppBuilds[app.type].clean(
                  app.output,
                  key,
                  app.command
                ),
              }),
            ];
          })
        )
      );

      this.apps = apps;
    }

    if (props.events) {
      this.event = new EventConstruct(this, 'EventStack', {
        resources: this.apps,
        events: props.events,
      });
    }

    this.secret = new SecretsConstruct(this, 'SecretsStack', {
      resources: {
        auth: this.auth,
        database: this.database,
        storage: this.storage,
        event: this.event,
      },
      secrets: props.secrets,
    });

    if (props.cdn) {
      this.cdn = new CDNConstruct(this, 'CDNStack', {
        routes: props.cdn.routes,
        resources: { ...this.apps, uploads: this.storage },
      });

      new cdk.CfnOutput(this, 'CDN Url', {
        key: 'cdnUrl',
        value: 'https://' + this.cdn.distribution.domainName,
      });
    }

    if (props.api) {
      this.api = new ApiGatewayConstruct(this, 'CDNStack', {
        routes: props.api.routes,
        resources: this.apps,
      });

      new cdk.CfnOutput(this, 'Api Url', {
        key: 'apiUrl',
        value: this.api.api.apiEndpoint,
      });
    }

    const resources = {
      storage: this.storage,
      database: this.database,
      auth: this.auth,
      secrets: this.secret,
      event: this.event
    };

    type ResourceKey = keyof typeof resources;

    for (const i in props.apps) {
      this.apps?.[i]?.attach(
        Object.fromEntries(
          Object.entries(props.apps[i]?.attachment ?? {})
            .map(([key]) => [key, resources[key as ResourceKey]])
            .filter((v) => !!v)
        )
      );

      this.apps?.[i]?.grant(
        ...(props.apps[i]?.grant
          ?.map(val => resources[val as ResourceKey])
          .filter((v) => !!v) ?? [])
      )
    }

    new cdk.CfnOutput(this, 'App Secrets', {
      key: 'appSecrets',
      value: this.secret.secrets.secretName,
    });
  }
}
