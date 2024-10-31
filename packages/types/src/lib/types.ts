import type { HttpRouteIntegration } from 'aws-cdk-lib/aws-apigatewayv2';
import type { BehaviorOptions } from 'aws-cdk-lib/aws-cloudfront';
import type { IGrantable } from 'aws-cdk-lib/aws-iam';
import type { ITopicSubscription } from 'aws-cdk-lib/aws-sns';
import type { SubscriptionProps } from 'aws-cdk-lib/aws-sns-subscriptions';

export interface Attachable {
  attachable(): Record<string, string>;
}

export interface Attach {
  attach(attachable: Record<string, Attachable>): void;
}

export interface Grantable {
  grantable(grant: IGrantable): void;
}

export interface Grant {
  grant(...grantables: Grantable[]): void;
}

export interface CDNResource {
  cloudfront(path: string): Record<string, BehaviorOptions>;
}

export interface Event {
  subscription(props: SubscriptionProps): ITopicSubscription;
}

export interface ApiResource {
  api(path: string): Record<string, HttpRouteIntegration>;
}

export type ResourceRef<T extends string = string> = { $resource: T };
