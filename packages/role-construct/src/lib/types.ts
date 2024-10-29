export type AppCapability = {
  auth?: boolean;
  storage?: boolean;
  database?: boolean;
  queue?: { batchSize?: number };
};

export interface RoleConstructProps {
  capabilities?: AppCapability;
  resources?: {
    storage?: string
    auth?: string;
    database?: { db: string, secret: string };
  }
}