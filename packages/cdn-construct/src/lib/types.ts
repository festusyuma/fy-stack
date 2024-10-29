import type { BehaviorOptions } from 'aws-cdk-lib/aws-cloudfront';
import type { Function } from 'aws-cdk-lib/aws-lambda';

export type CDNResource = { cloudfront(path: string): Record<string, BehaviorOptions> }

export interface CDNConstructProps {
  routes: Record<string, { $app: string } | { $resource: string }>;
  apps: Record<string, (CDNResource & { function: Function }) | undefined>;
  resources: Record<string, CDNResource | undefined>;
}
