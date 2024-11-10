export interface AuthConstructProps {
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
  /** Domain name prefix */
  domainPrefix?: string
}
