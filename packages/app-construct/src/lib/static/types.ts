import { type ApiResource, AppType, type CDNResource } from '@fy-stack/types';

export type StaticConstructProps = {
  apps: Record<string, App>;
};

export interface AppConstruct extends CDNResource, ApiResource {}

export type AppSource =
  | { output: string }
  | { reference: string; version?: string };

export type App = {
  type: typeof AppType.NEXT_PAGE_EXPORT | typeof AppType.STATIC_WEBSITE;
  buildParams?: Record<string, unknown>;
} & AppSource;

export type AppProperties<
  BuildParams extends Record<string, unknown> = Partial<Record<string, unknown>>
> = {
  buildParams: BuildParams;
} & AppSource;
