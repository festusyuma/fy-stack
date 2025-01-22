import { ApiGatewayConstruct } from '@fy-stack/apigateway-construct';
import {
  type AppConstruct,
  ImageAppConstruct,
  NextAppRouterConstruct,
  NextPagesExportConstruct,
  NodeApiConstruct,
  NodeAppConstruct,
  StaticWebsiteConstruct,
} from '@fy-stack/app-construct';
import { AuthConstruct } from '@fy-stack/auth-construct';
import { CDNConstruct } from '@fy-stack/cdn-construct';
import { DatabaseConstruct } from '@fy-stack/database-construct';
import { EventConstruct } from '@fy-stack/event-construct';
import { SecretsConstruct } from '@fy-stack/secret-construct';
import { StorageConstruct } from '@fy-stack/storage-construct';
import { TaskConstruct } from '@fy-stack/task-construct';
import { CfnOutput } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

import { AppType, FullStackConstructProps } from './types';

const AppBuilds = {
  [AppType.NEXT_APP_ROUTER]: NextAppRouterConstruct,
  [AppType.NEXT_PAGE_EXPORT]: NextPagesExportConstruct,
  [AppType.NODE_APP]: NodeAppConstruct,
  [AppType.NODE_API]: NodeApiConstruct,
  [AppType.IMAGE_APP]: ImageAppConstruct,
  [AppType.STATIC_WEBSITE]: StaticWebsiteConstruct,
};

/**
 *
 */
export class FullStackConstruct extends Construct {
  public vpc: ec2.IVpc;
  public auth?: AuthConstruct;
  public storage?: StorageConstruct;
  public storagePolicy?: string;
  public database?: DatabaseConstruct;
  public event?: EventConstruct;
  public apps?: Record<string, AppConstruct>;
  public tasks?: Record<string, TaskConstruct>;
  public cdn?: CDNConstruct;
  public api?: ApiGatewayConstruct;
  public secret: SecretsConstruct;

  constructor(scope: Construct, id: string, props: FullStackConstructProps) {
    super(scope, id);

    this.vpc = ec2.Vpc.fromLookup(
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
        vpcId: this.vpc.vpcId,
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
                // @ts-expect-error invalid params
                buildParams: AppTypeConstruct.parse(app.buildParams ?? {}),
                vpc: this.vpc,
                ...app
              }),
            ];
          })
        )
      );

      this.apps = apps;
    }

    if (props.task) {
      const tasks: Record<string, TaskConstruct> = {};
      const cluster = new ecs.Cluster(this, 'AppCluster', { vpc: this.vpc })

      Object.assign(
        tasks,
        Object.fromEntries(
          Object.entries(props.task).map(([key, task]) => {
            return [
              key,
              new TaskConstruct(this, `${key}Task`, {
                clusterArn: cluster.clusterArn,
                vpc: this.vpc,
                ...task
              }),
            ];
          })
        )
      );

      this.tasks = tasks;
    }

    if (props.events) {
      this.event = new EventConstruct(this, 'EventConstruct', {
        resources: { ...this.apps, ...this.tasks },
        ...props.events,
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
        resources: { ...this.apps, storage: this.storage },
      });

      new CfnOutput(this, 'CDN Url', {
        key: 'cdnURl',
        value: 'https://' + this.cdn.distribution.domainName,
      });
    }

    if (props.api) {
      this.api = new ApiGatewayConstruct(this, 'ApiConstruct', {
        routes: props.api.routes,
        resources: this.apps,
      });

      if (this.api.api.url) {
        new CfnOutput(this, 'Api Url', {
          key: 'apiUrl',
          value: this.api.api.url,
        });
      }
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
      this.storagePolicy = JSON.stringify(
        this.storage.cloudfrontPolicy(this.cdn.distribution.distributionId)
      );

      new CfnOutput(this, 'StorageBucketCDNPolicy', {
        key: 'storageBucketCDNPolicy',
        value: this.storagePolicy
      });
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

    for (const i in props.task) {
      const attachments = Object.entries(props.task[i]?.attachment ?? {})
        .map(([key]) => [key, resources[key as ResourceKey]])
        .filter((v) => !!v);

      if (attachments.length) {
        this.tasks?.[i]?.attach(Object.fromEntries(attachments));
      }

      const grants =
        props.task[i]?.grant
          ?.map((val) => resources[val as ResourceKey])
          .filter((v) => !!v) ?? [];

      if (grants.length) {
        this.tasks?.[i]?.grant(...grants);
      }
    }
  }
}
