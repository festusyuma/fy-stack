import type { HttpRouteIntegration } from 'aws-cdk-lib/aws-apigatewayv2';
import type { BehaviorOptions } from 'aws-cdk-lib/aws-cloudfront';
import type { IGrantable } from 'aws-cdk-lib/aws-iam';
import type { ITopicSubscription } from 'aws-cdk-lib/aws-sns';
import type { SubscriptionProps } from 'aws-cdk-lib/aws-sns-subscriptions';

/**
 * Resource can be attached to other resources
 * */
export interface Attachable {
  /**
   * Return values needed to enable resource to be attached
   * */
  attachable(): Record<string, string>;
}

/**
 * Other resources can be attached to this resource
 * */
export interface Attach {
  /**
   * Attach Attachable resources to Resource
   * */
  attach(attachable: Record<string, Attachable>): void;
}

/**
 * Resource can grant permission resources
 * */
export interface Grantable {
  /**
   * Grant permissions to IGrantable resource
   * */
  grantable(grant: IGrantable): void;
}

/**
 * Resource can be granted permissions by resources
 * */
export interface Grant {
  /**
   * Initialize permission grants from Grantable resources
   * */
  grant(...grantables: Grantable[]): void;
}

/**
 * Resource can be attached to a Cloudfront distribution
 * */
export interface CDNResource {
  /**
   * Generate map of paths to Cloudfront BehaviorOptions.
   * */
  cloudfront(path: string): Record<string, BehaviorOptions>;
}

/**
 * Resource can subscribe to an SNS topic
 * */
export interface Event {
  /**
   * Subscribe to SNS topic.
   * */
  subscription(props: SubscriptionProps): ITopicSubscription;
}

/**
 * Resource can be attached to an API gateway
 * */
export interface ApiResource {
  /**
   * Generate map of paths to API gateway HttpRouteIntegration.
   * */
  api(path: string): Record<string, HttpRouteIntegration>;
}

/**
 * Reference existing application or resource e.g. auth.
 * */
export type ResourceRef<T extends string = string> = {
  /**
   * Name of app or resources e.g. uploads, auth.
   * */
  $resource: T;
};
