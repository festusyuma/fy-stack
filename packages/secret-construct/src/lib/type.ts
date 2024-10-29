import { AppConstruct } from '@fy-stack/app-construct';

export interface WithSecrets {
  secrets(): Record<string, string>
}

export interface SecretConstructProps {
  apps: Record<string, AppConstruct>;
  secrets?: Record<string, string | undefined>;
  resources?: Record<string, WithSecrets | undefined>
}
