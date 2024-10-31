import type { CDNResource, ResourceRef } from '@fy-stack/types';

export interface CDNConstructProps {
  routes: Record<string, ResourceRef>;
  resources?: Record<string, CDNResource | undefined>;
}
