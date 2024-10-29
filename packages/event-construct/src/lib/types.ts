import type { AppConstruct } from '@fy-stack/app-construct';
import type { CronOptions } from 'aws-cdk-lib/aws-events';

export type AppRef = { $app: string };

export type AppMessage = AppRef & {
  messages: string[];
  publish?: boolean;
};

export type AppCron = {
  messages: string[];
  cron: CronOptions;
};

export interface EventConstructProps {
  apps: Record<string, AppConstruct>;
  events?: {
    messages?: AppMessage[];
    cron?: AppCron[];
  };
}