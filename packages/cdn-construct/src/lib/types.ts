import type { CDNResource, Domain,ResourceRef } from '@fy-stack/types';

export type RouteProps = { private?: true };

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
  domains?: Domain[];
}
