import * as events from 'aws-cdk-lib/aws-events';

export enum AppType {
  NEST = 'nest',
  NEST_API = 'nestApi',
  NEXT_APP_ROUTER = 'nextAppRouter',
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
  command: string;
};

export enum AppResourceType {
  UPLOADS = 'uploads',
  AUTH = 'auth',
}

export type AppRef = { $app: string };
export type ResourceRef = { $resource: AppResourceType };

export type AppMessage = AppRef & {
  messages: string[];
  publish?: boolean;
};

export type AppCron = {
  messages: string[];
  cron: events.CronOptions;
};

export type FullStackConstructProps = {
  appId: string;
  auth?: { groups?: string[] };
  storage?: { retainOnDelete?: boolean };
  database?: boolean;
  apps?: Record<string, App>;
  events?: {
    messages?: AppMessage[];
    cron?: AppCron[];
  };
  cdn?: { routes: Record<string, AppRef | ResourceRef> };
  secrets?: Record<string, string | undefined>;
};
