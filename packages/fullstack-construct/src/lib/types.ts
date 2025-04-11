import type { CDNConstructProps } from '@fy-stack/cdn-construct';
import type { DatabaseConstructProps } from '@fy-stack/database-construct';
import type { EventConstructProps } from '@fy-stack/event-construct';
import type { StorageConstructProps } from '@fy-stack/storage-construct';
import type { TaskConstructsProps } from '@fy-stack/task-construct';
import type { ResourceRef } from '@fy-stack/types';

export enum AppType {
  NODE_APP = 'nodeApp',
  NODE_API = 'nestApi',
  IMAGE_APP = 'imageApp',
  NEXT_APP_ROUTER = 'nextAppRouter',
  NEXT_PAGE_EXPORT = 'nextPageExport',
  STATIC_WEBSITE = 'staticWebsite',
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
  env?: Record<string, string>
  buildParams?: Record<string, unknown>;
};

export type Task = Omit<TaskConstructsProps, "clusterArn" | "vpc"> & {
  attachment?: AppAttachment;
  grant?: AppGrant[];
}

export type AppMessage = ResourceRef & {
  messages: string[];
};

export type FullStackConstructProps = {
  vpcId?: string,
  appId: string;
  auth?: { groups?: string[] };
  storage?: StorageConstructProps;
  database?: DatabaseConstructProps;
  apps?: Record<string, App>;
  events?: Omit<EventConstructProps, "resources">;
  cdn?: Omit<CDNConstructProps, "resources">;
  api?: { routes: Record<string, ResourceRef> };
  secrets?: Record<string, string | undefined>;
  task?: Record<string, Task>;
};
