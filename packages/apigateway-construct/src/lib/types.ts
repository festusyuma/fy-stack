import type { ApiResource,ResourceRef } from '@fy-stack/types';

export type ApiGatewayConstructProps = {
  /**
   * A map of route names to their respective resource references.
   * Each key in the record represents a unique route name, and the associated value is an instance of ResourceRef.
   */
  routes: Record<string, ResourceRef>;
  /**
   * An optional object mapping resource names to their corresponding `ApiResource` objects.
   * Each key in this object represents a unique resource identifier, and the associated
   * value implements `ApiResource`
   */
  resources?: Record<string, ApiResource | undefined>;
};