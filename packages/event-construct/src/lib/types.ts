import type { Event } from '@fy-stack/types';
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
  resources?: Record<string, Event>;
  events?: {
    messages?: AppMessage[];
    cron?: AppCron[];
  };
}