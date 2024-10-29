import type { CDNResource } from '@fy-stack/types';
import type { Function } from 'aws-cdk-lib/aws-lambda';

export interface CDNConstructProps {
  routes: Record<string, { $app: string } | { $resource: string }>;
  apps: Record<string, (CDNResource & { function: Function }) | undefined>;
  resources: Record<string, CDNResource | undefined>;
}
