import { ApiGatewayConstruct } from '@fy-stack/apigateway-construct';
import {
  type AppConstruct,
  ImageAppConstruct,
  NextAppRouterConstruct,
  NextPagesExportConstruct,
  NodeApiConstruct,
  NodeAppConstruct,
} from '@fy-stack/app-construct';
import { AuthConstruct } from '@fy-stack/auth-construct';
import { CDNConstruct } from '@fy-stack/cdn-construct';
import { DatabaseConstruct } from '@fy-stack/database-construct';
import { EventConstruct } from '@fy-stack/event-construct';
import { SecretsConstruct } from '@fy-stack/secret-construct';
import { StorageConstruct } from '@fy-stack/storage-construct';
import ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

import { AppType, FullStackConstructProps } from './types';

const AppBuilds = {
  [AppType.NEXT_APP_ROUTER]: NextAppRouterConstruct,
  [AppType.NEXT_PAGE_EXPORT]: NextPagesExportConstruct,
  [AppType.NODE_APP]: NodeAppConstruct,
  [AppType.NODE_API]: NodeApiConstruct,
  [AppType.IMAGE_APP]: ImageAppConstruct,
};

/**
 *
 */
export class FullStackConstruct extends Construct {
  public auth?: AuthConstruct;
  public storage?: StorageConstruct;
  public storagePolicy?: string;
  public database?: DatabaseConstruct;
  public event?: EventConstruct;
  public apps?: Record<string, AppConstruct>;
  public cdn?: CDNConstruct;
  public api?: ApiGatewayConstruct;
  public secret: SecretsConstruct;

  constructor(scope: Construct, id: string, props: FullStackConstructProps) {
    super(scope, id);

    const vpc = ec2.Vpc.fromLookup(
      this,
      'VPC',
      props.vpcId ? { vpcId: props.vpcId } : { isDefault: true }
    );

    if (props.auth) {
      this.auth = new AuthConstruct(this, props.appId + 'AuthConstruct', {
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
        vpcId: vpc.vpcId,
      });
    }

    if (props.apps) {
      const apps: Record<string, AppConstruct> = {};

      Object.assign(
        apps,
        Object.fromEntries(
          Object.entries(props.apps).map(([key, app]) => {
            const AppTypeConstruct = AppBuilds[app.type];

            return [
              key,
              new AppTypeConstruct(this, `${key}App`, {
                queue: app.attachment?.queue,
                output: app.output,
                buildParams: app.buildParams,
              }),
            ];
          })
        )
      );

      this.apps = apps;
    }

    if (props.events) {
      this.event = new EventConstruct(this, 'EventConstruct', {
        resources: this.apps,
        events: props.events,
      });
    }

    this.secret = new SecretsConstruct(this, 'SecretConstruct', {
      resources: {
        auth: this.auth,
        database: this.database,
        storage: this.storage,
        event: this.event,
      },
      secrets: props.secrets,
    });

    if (props.cdn) {
      this.cdn = new CDNConstruct(this, 'CDNConstruct', {
        routes: props.cdn.routes,
        domains: props.cdn.domains,
        resources: { ...this.apps, uploads: this.storage },
      });
    }

    if (props.api) {
      this.api = new ApiGatewayConstruct(this, 'ApiConstruct', {
        routes: props.api.routes,
        resources: this.apps,
      });
    }

    const resources = {
      storage: this.storage,
      database: this.database,
      auth: this.auth,
      secrets: this.secret,
      event: this.event,
    };

    type ResourceKey = keyof typeof resources;

    if (this.storage && this.cdn) {
      this.storagePolicy = JSON.stringify(this.storage.cloudfrontPolicy(this.cdn.distribution.distributionId))
    }

    for (const i in props.apps) {
      const attachments = Object.entries(props.apps[i]?.attachment ?? {})
        .map(([key]) => [key, resources[key as ResourceKey]])
        .filter((v) => !!v);

      if (attachments.length) {
        this.apps?.[i]?.attach(Object.fromEntries(attachments));
      }

      const grants =
        props.apps[i]?.grant
          ?.map((val) => resources[val as ResourceKey])
          .filter((v) => !!v) ?? [];

      if (grants.length) {
        this.apps?.[i]?.grant(...grants);
      }
    }
  }
}
