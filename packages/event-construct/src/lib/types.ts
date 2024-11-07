import type { Event, ResourceRef } from '@fy-stack/types';
import type { CronOptions } from 'aws-cdk-lib/aws-events';

export type AppMessage = ResourceRef & {
  messages: string[];
};

export type AppCron = {
  messages: string[];
  cron: CronOptions;
};

export interface EventConstructProps {
  /**
   * A collection of resource objects, where each resource is keyed by a unique string.
   * Each value in the collection implements the Event interface.
   */
  resources?: Record<string, Event>;
  /**
   * Represents events associated with the construct.
   */
  events?: {
    /**
     * List of resource to messages mapping
     * */
    messages?: AppMessage[];
    /**
     * List of cron objects
     * */
    cron?: AppCron[];
  };
}