import type { EventResource, ResourceRef } from '@fy-stack/types';
import {
  AuthorizationType,
  CfnApiProps,
  LambdaAuthorizerConfig,
} from 'aws-cdk-lib/aws-appsync';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import type { CronOptions } from 'aws-cdk-lib/aws-events';
import type { Duration } from 'aws-cdk-lib/core';

export type MessageHandler = ResourceRef & {
  messages: string[];
};

export type AppSchedule = {
  messages: string[];
  cron?: CronOptions;
  expression?: string;
  rate?: Duration;
};

export interface EventConstructProps {
  /**
   * A collection of resource objects, where each resource is keyed by a unique string.
   * Each value in the collection implements the Event interface.
   */
  resources?: Record<string, EventResource>;
  /**
   * List of resource to messages mapping
   * */
  handlers?: MessageHandler[];
  /**
   * List of cron objects
   * */
  schedule?: AppSchedule[];
}

export enum AuthProviderCapability {
  CONNECT = 'CONNECT',
  PUBLISH = 'PUBLISH',
  SUBSCRIBE = 'SUBSCRIBE',
}

export interface WebsocketConstructProps
  extends Omit<CfnApiProps, 'eventConfig' | 'name'> {
  /** Api Name */
  name?: string;
  /**
   * Available authorization providers and capabilities
   * */
  authProviders: ((
    | {
        /** Generates Api Key to be used for authorization */
        type: AuthorizationType.API_KEY;
        /**
         * Time after the Api key should expire, expressed in days
         *  */
        expires: number;
      }
    | {
        /**
         * User pool authorization
         * */
        type: AuthorizationType.USER_POOL;
        userPool: UserPool;
      }
    | ({
        /**
         * Lambda function authorization
         * */
        type: AuthorizationType.LAMBDA;
      } & LambdaAuthorizerConfig)
  ) & {
    /**
     * Determine actions authorization can be used for
     * */
    capabilities: AuthProviderCapability[];
  })[];
}
