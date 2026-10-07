import type {
  EcsConstructProps,
  LambdaConstructProps,
  StaticConstructProps,
} from '@fy-stack/app-construct';
import type { AuthConstructProps } from '@fy-stack/auth-construct';
import type { CDNConstructProps } from '@fy-stack/cdn-construct';
import type { DatabaseConstructProps } from '@fy-stack/database-construct';
import type { EventConstructProps } from '@fy-stack/event-construct';
import type { StorageConstructProps } from '@fy-stack/storage-construct';
import { AppGrant, type ResourceRef, type Domain } from '@fy-stack/types';
import type { IRole, IUser } from 'aws-cdk-lib/aws-iam';

/**
 * Attach resource
 * */
export type AppAttachment = {
  auth?: boolean;
  storage?: boolean;
  database?: boolean;
  secret?: boolean;
};

export type AppMessage = ResourceRef & {
  messages: string[];
};

export type FullStackConstructProps = {
  name: string;
  environment: string;
  vpcId?: string;
  domain?: Domain;
  auth?: Omit<AuthConstructProps, 'environment' | 'appName' | 'domain'>;
  storage?: StorageConstructProps;
  database?: DatabaseConstructProps;
  ecs?: Omit<
    EcsConstructProps,
    'vpc' | 'environmentPath' | 'server' | 'tasks' | 'environment' | 'logGroup'
  > & {
    server: Omit<NonNullable<EcsConstructProps['server']>, 'apps'> & {
      grants?: AppGrant[];
      apps: Record<
        string,
        NonNullable<EcsConstructProps['server']>['apps'][string] & {
          attachment?: AppAttachment;
        }
      >;
    };
    tasks: Record<
      string,
      NonNullable<EcsConstructProps['tasks']>[string] & {
        grants?: AppGrant[];
        attachment?: AppAttachment;
      }
    >;
  };
  lambda?: Record<
    string,
    NonNullable<LambdaConstructProps['apps']>[string] & {
      grants?: AppGrant[];
      attachment?: AppAttachment;
    }
  >;
  static?: StaticConstructProps['apps'];
  event?: Omit<EventConstructProps, 'resources'>;
  cdn?: Omit<CDNConstructProps, 'resources'>;
  api?: { routes: Record<string, ResourceRef> };
  secret?: Record<string, string | undefined>;
  outputs?: boolean;
  ownerArn?: string;
};

export type Owner =
  | { type: 'user'; principal: IUser }
  | { type: 'role'; principal: IRole };
