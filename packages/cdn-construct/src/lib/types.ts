import type { CDNResource, ResourceRef } from '@fy-stack/types';

export interface CDNConstructProps {
  /**
   * A mapping of route paths to resource references
   * */
  routes: Record<string, ResourceRef>;
  /**
   * An optional mapping of resource names to CDN resources.
   * */
  resources?: Record<string, CDNResource | undefined>;
}
