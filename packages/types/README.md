# @fy-stack/types

Shared TypeScript interfaces, types, and constants used across `@fy-stack` constructs for resource attachment, IAM permission grants, and integrations with CloudFront, SNS/EventBridge, and API Gateway.

## Installation

```bash
npm install @fy-stack/types
```

## Constants & Enums

### `AppType`

Supported application types across Lambda, ECS, and Static constructs:

| Constant | Value | Description |
|---|---|---|
| `AppType.NODE_APP` | `'nodeApp'` | Standard Node.js Lambda application |
| `AppType.NODE_API` | `'nestApi'` | Web-adapter-backed Node.js HTTP API (e.g. NestJS) |
| `AppType.IMAGE_APP` | `'imageApp'` | Docker container image application (Lambda or ECS) |
| `AppType.NEXT_APP_ROUTER` | `'nextAppRouter'` | Next.js App Router (standalone server + static assets on Lambda or ECS) |
| `AppType.REACT_ROUTER` | `'reactRouter'` | React Router server-rendered application (ECS) |
| `AppType.NEXT_PAGE_EXPORT` | `'nextPageExport'` | Static Next.js export (`StaticConstruct`) |
| `AppType.STATIC_WEBSITE` | `'staticWebsite'` | Static website / SPA (`StaticConstruct`) |

### `AppGrant`

Identifiers for infrastructure resources that can grant IAM permissions to compute constructs:

| Constant | Value |
|---|---|
| `AppGrant.AUTH` | `'auth'` |
| `AppGrant.STORAGE` | `'storage'` |
| `AppGrant.DATABASE` | `'database'` |
| `AppGrant.SECRET` | `'secret'` |
| `AppGrant.EVENT` | `'event'` |

## Interfaces

### `Attachable`

Represents a resource whose configuration/connection metadata can be attached to other resources (e.g. as environment variables or secret values).

- **`attachable(): Record<string, string>`**
  Returns key-value pairs representing the attributes needed to connect to or reference this resource.

### `Attach`

Represents a compute resource that can receive `Attachable` resources.

- **`attach(attachable: Record<string, Attachable>): void`**
  Accepts a map of named `Attachable` resources and injects their attributes (prefixed with `<KEY>_` in uppercase) into the target resource's environment.

### `Grantable`

Represents a resource that can grant IAM permissions to an `IGrantable` principal.

- **`grantable(grant: IGrantable): void`**
  Grants the necessary IAM permissions to interact with this resource.

### `Grant`

Represents a compute resource that can receive IAM permission grants from one or more `Grantable` resources.

- **`grant(...grantables: Grantable[]): void`**
  Initializes permission grants for each provided `Grantable` resource on the compute resource's execution/task role.

### `CDNResource`

Represents a resource that can be exposed behind a CloudFront distribution.

- **`cloudfront(path: string, keys?: KeyGroup): Record<string, BehaviorOptions>`**
  Generates a mapping of route path patterns to CloudFront `BehaviorOptions`, optionally restricting access via a CloudFront `KeyGroup`.
- **`cloudfrontPolicy(distributionId: string): unknown`**
  Generates a resource policy statement (as JSON) granting the CloudFront distribution access to the resource (when applicable, e.g. S3 storage).

### `EventResource`

Represents a resource that can subscribe to an SNS topic to handle events.

- **`subscription(props: SubscriptionProps): ITopicSubscription`**
  Subscribes the resource to an SNS topic using the provided subscription properties (such as message filter policies).

### `ApiResource`

Represents a resource that can be exposed via an HTTP API Gateway (`HttpApi`).

- **`api(path: string): Record<string, HttpRouteIntegration>`**
  Generates a map of route paths to API Gateway `HttpRouteIntegration` instances.

## Utility Types

### `ResourceRef<T extends string = string>`

References a named application or resource within a construct configuration (e.g. in CDN or API Gateway route maps).

```ts
type ResourceRef<T extends string = string> = {
  $resource: T;
};
```

### `Domain`

Custom domain and subdomain record configuration used by `CDNConstruct`, `AuthConstruct`, and `FullStackConstruct`.

```ts
type Domain = {
  /** Root domain name (e.g. "example.com") */
  domain: string;
  /** Subdomain records to map (use "*" for the root/apex domain) */
  records: string[];
};
```

### `StackContext`

Persisted context format (written to `fy-stack.context.json`) used to track deterministic ALB listener rule priorities across deployments.

```ts
type StackContext = {
  loadBalancer?: {
    priorities?: Record<string, number>;
  };
};
```
