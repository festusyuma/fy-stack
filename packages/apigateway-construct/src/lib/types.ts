import type { ApiResource,ResourceRef } from '@fy-stack/types';

export type ApiGatewayConstructProps = {
  routes: Record<string, ResourceRef>;
  resources?: Record<string, ApiResource | undefined>;
};