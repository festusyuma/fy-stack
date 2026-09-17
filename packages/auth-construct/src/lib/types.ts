import type { SignInAliases } from 'aws-cdk-lib/aws-cognito';

export interface AuthConstructProps {
  appName: string;
  environment: string;
  signInAliases?: SignInAliases;
  domain?: string;
  domainPrefix?: string[];
  /** User pool group names */
  groups?: string[];
  /**
   * Token options
   * */
  token?: {
    /** Access token validity in hours */
    accessTokenValidity?: number;
    /** Refresh token validity in hours */
    refreshTokenValidity?: number;
  };
}
