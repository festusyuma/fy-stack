import type { CDNResource, ResourceRef } from '@fy-stack/types';

export type RouteProps = { public?: false };

export interface CDNConstructProps {
  /**
   * A mapping of route paths to resource references
   * */
  routes: Record<string, ResourceRef & RouteProps>;
  key?: string;
  /**
   * An optional mapping of resource names to CDN resources.
   * */
  resources?: Record<string, CDNResource | undefined>;
  /**
   * A list of domain name records
   * */
  domains?: {
    /**
     * Domain name
     * */
    domain: string;
    /**
     * Domain name records to map to distribution,
     * add "*" for default
     * */
    records: string[];
  }[];
}
