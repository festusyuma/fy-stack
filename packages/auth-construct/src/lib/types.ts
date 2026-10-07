import type { Domain } from '@fy-stack/types';
import type {
  SignInAliases,
  UserPoolClientProps,
} from 'aws-cdk-lib/aws-cognito';

export interface AuthConstructProps {
  appName: string;
  environment: string;
  signInAliases?: SignInAliases;
  domain?: Domain;
  domainPrefix?: string[];
  /** User pool group names */
  groups?: string[];
  /**
   * Token options
   * */
  token?: {
    /** Access token validity in minutes */
    accessTokenValidity?: number;
    /** Refresh token validity in minutes */
    refreshTokenValidity?: number;
  };
  client?: Partial<UserPoolClientProps>;
}
