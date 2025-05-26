import { type ApiResource, AppType, type CDNResource } from '@fy-stack/types';

export type StaticConstructProps = {
  apps: Record<string, App>;
};

export interface AppConstruct extends CDNResource, ApiResource {}

export type App = {
  type: typeof AppType.NEXT_PAGE_EXPORT | typeof AppType.STATIC_WEBSITE;
  output: string;
  buildParams?: Record<string, unknown>;
};

export type AppProperties<BuildParams = Record<string, unknown>> = {
  buildParams: BuildParams;
  output: string;
};
