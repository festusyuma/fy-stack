import { Attachable } from '@fy-stack/types';

export interface SecretConstructProps {
  secrets?: Record<string, string | undefined>;
  resources?: Record<string, Attachable | undefined>
}
