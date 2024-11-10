import { Attachable } from '@fy-stack/types';

/**
 * Interface representing the properties for the construction of secrets.
 */
export interface SecretConstructProps {
  /**
   * A collection of default static values to be added to the secrets created
   * */
  secrets?: Record<string, string | undefined>;

  /**
   * A collection of resources that can be attached. The keys are resource names, and the values
   * are an instance of {@link Attachable `Attachable`}.
   */
  resources?: Record<string, Attachable | undefined>
}
