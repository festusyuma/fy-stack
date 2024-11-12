import { DatabaseConstructProps } from '@fy-stack/database-construct';
import { ResourceRef } from '@fy-stack/types';
import * as events from 'aws-cdk-lib/aws-events';
import { CDNConstructProps } from '@fy-stack/cdn-construct';

export enum AppType {
  NODE_APP = 'nodeApp',
  NODE_API = 'nestApi',
  IMAGE_APP = 'imageApp',
  NEXT_APP_ROUTER = 'nextAppRouter',
  NEXT_PAGE_EXPORT = 'nextPageExport',
}

export type AppAttachment = {
  auth?: boolean;
  storage?: boolean;
  database?: boolean;
  secrets?: boolean;
  queue?: { batchSize?: number };
};

export enum AppGrant {
  AUTH = 'auth',
  STORAGE = 'storage',
  DATABASE = 'database',
  SECRETS = 'secrets',
  EVENT = 'event',
}

export type App = {
  type: AppType;
  output: string;
  attachment?: AppAttachment;
  grant?: AppGrant[];
  buildParams?: Record<string, string>;
};

export type AppMessage = ResourceRef & {
  messages: string[];
};

export type AppCron = {
  messages: string[];
  cron: events.CronOptions;
};

export type FullStackConstructProps = {
  appId: string;
  auth?: { groups?: string[] };
  storage?: { retainOnDelete?: boolean };
  database?: DatabaseConstructProps;
  apps?: Record<string, App>;
  events?: {
    messages?: AppMessage[];
    cron?: AppCron[];
  };
  cdn?: Omit<CDNConstructProps, "resources">;
  api?: { routes: Record<string, ResourceRef> };
  secrets?: Record<string, string | undefined>;
};
