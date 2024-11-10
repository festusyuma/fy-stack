
# FY-Stack Types

This module defines several interfaces for managing FY-Stack resources. These interfaces support actions like attaching resources, granting permissions, and integrating with CloudFront, SNS, and API Gateway.

## Interfaces

### `Attachable`
Represents a resource that can be attached to other resources.

- **Method**
    - `attachable(): Record<string, string>` 
      Returns a set of key-value pairs representing the attributes needed to attach this resource to another. The keys and values in the returned object are specific to the resource.

### `Attach`
Represents a resource that can attach `Attachable` resources to itself.

- **Method**
    - `attach(attachable: Record<string, Attachable>): void`
      Takes an object of `Attachable` resources and attaches each to the current resource. The `Attachable` resources are provided as a map, where each key-value pair represents a resource to be attached.

### `Grantable`
Represents a resource that can grant permissions to other resources.

- **Method**
    - `grantable(grant: IGrantable): void`
      Accepts an `IGrantable` object and grants it the necessary permissions to interact with this resource.

### `Grant`
Represents a resource that can be granted permissions by other resources.

- **Method**
    - `grant(...grantables: Grantable[]): void`
      Accepts multiple `Grantable` resources and initializes permission grants for each. This allows the resource to manage permission relationships with multiple other resources.

### `CDNResource`
Represents a resource that can be associated with a CloudFront distribution.

- **Method**
    - `cloudfront(path: string): Record<string, BehaviorOptions>`
      Generates and returns a mapping of paths to CloudFront `BehaviorOptions`, which define how the resource should behave when distributed via CloudFront.

### `Event`
Represents a resource that can subscribe to an SNS topic.

- **Method**
    - `subscription(props: SubscriptionProps): ITopicSubscription`
      Subscribes the resource to an SNS topic using the provided subscription properties. Returns an `ITopicSubscription` object representing the subscription.

### `ApiResource`
Represents a resource that can be integrated with an API Gateway.

- **Method**
    - `api(path: string): Record<string, HttpRouteIntegration>`
      Generates a mapping of paths to API Gateway `HttpRouteIntegration`, allowing the resource to be exposed via an API Gateway route.

### `ResourceRef`
A type definition for referencing existing resources within an application, identified by name.

- **Properties**
    - `$resource: T`
      Represents the name of the application or resource, allowing it to be referenced by name within the system. This is useful for referencing resources like `auth` or `uploads`.
