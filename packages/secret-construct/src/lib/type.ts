import { AppConstruct } from '@fy-stack/app-construct';
import { AuthConstruct } from '@fy-stack/auth-construct';
import { DatabaseConstruct } from '@fy-stack/database-construct';
import { EventConstruct } from '@fy-stack/event-construct';
import { StorageConstruct } from '@fy-stack/storage-construct';

export interface SecretConstructProps {
  auth?: AuthConstruct;
  database?: DatabaseConstruct;
  event?: EventConstruct;
  storage?: StorageConstruct;
  apps: Record<string, AppConstruct>;
  secrets?: Record<string, string | undefined>;
}
