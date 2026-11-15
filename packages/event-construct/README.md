# @fy-stack/event-construct

Provides AWS CDK constructs for event-driven messaging (`EventConstruct` using SNS + EventBridge schedules) and real-time WebSocket pub/sub (`WebsocketConstruct` using AWS AppSync Event APIs).

## Installation

```bash
npm install @fy-stack/event-construct
```

---

## `EventConstruct`

`EventConstruct` creates an Amazon SNS topic (`AppTopic`), subscribes `EventResource` targets with message-body filter policies, and configures Amazon EventBridge rules to publish scheduled messages to the topic.

Implements the `Attachable` and `Grantable` interfaces from `@fy-stack/types`.

### Public Properties

- **`topic: sns.Topic`** — The SNS topic managed by this construct.

### Constructor & Props (`EventConstructProps`)

```ts
new EventConstruct(scope: Construct, id: string, props: EventConstructProps)
```

| Property | Type | Description |
|---|---|---|
| `resources` | `Record<string, EventResource>` | Map of resource names to `EventResource` instances (e.g. Lambda functions or ECS tasks). |
| `handlers` | `MessageHandler[]` | Array of `{ $resource: string; messages: string[] }` mappings. Subscribes each referenced resource to the SNS topic with a `filterPolicyWithMessageBody` allowlist on the `message` field. |
| `schedule` | `AppSchedule[]` | Array of scheduled jobs (`{ messages: string[]; cron?: CronOptions; expression?: string; rate?: Duration }`). Creates EventBridge rules that publish `{ message, payload: {} }` to the SNS topic. |

### Methods

- **`attachable()`** — Returns `{ TOPIC: this.topic.topicArn }`.
- **`grantable(grant: iam.IGrantable)`** — Grants publish permissions (`this.topic.grantPublish(grant)`) on the SNS topic.

---

## `WebsocketConstruct`

`WebsocketConstruct` provisions an AWS AppSync Event API (`CfnApi`) with configurable authorization providers (`API_KEY`, `USER_POOL`, `LAMBDA`) and per-provider capabilities (`CONNECT`, `PUBLISH`, `SUBSCRIBE`).

Implements the `Attachable` interface from `@fy-stack/types`.

### Public Properties

- **`socket: appsync.CfnApi`** — The underlying AppSync Event API resource.
- **`apiKey: appsync.CfnApiKey | undefined`** — The generated API key resource if an `API_KEY` auth provider is configured.

### Constructor & Props (`WebsocketConstructProps`)

```ts
new WebsocketConstruct(scope: Construct, id: string, props: WebsocketConstructProps)
```

`WebsocketConstructProps` extends `Omit<CfnApiProps, 'eventConfig' | 'name'>`:

| Property | Type | Description |
|---|---|---|
| `name` | `string` | Optional API name (defaults to `${id}-socket`). |
| `authProviders` | `AuthProvider[]` | Array of authorization provider configurations and their allowed `AuthProviderCapability[]` (`CONNECT`, `PUBLISH`, `SUBSCRIBE`). |

#### Supported Auth Providers

1. **API Key (`AuthorizationType.API_KEY`)**
   ```ts
   {
     type: AuthorizationType.API_KEY,
     expires: 30, // Expiration in days from deployment
     capabilities: [AuthProviderCapability.CONNECT, AuthProviderCapability.SUBSCRIBE],
   }
   ```
2. **Cognito User Pool (`AuthorizationType.USER_POOL`)**
   ```ts
   {
     type: AuthorizationType.USER_POOL,
     userPool: authConstruct.userPool,
     capabilities: [AuthProviderCapability.CONNECT, AuthProviderCapability.PUBLISH, AuthProviderCapability.SUBSCRIBE],
   }
   ```
3. **Lambda Authorizer (`AuthorizationType.LAMBDA`)**
   ```ts
   {
     type: AuthorizationType.LAMBDA,
     handler: authorizerFn,
     resultsCacheTtl: Duration.minutes(5),
     validationRegex: '^Bearer .*',
     capabilities: [AuthProviderCapability.CONNECT],
   }
   ```

### Methods

- **`attachable()`** — Returns:
  - `ARN`: AppSync API ARN
  - `HTTP_DNS`: HTTP endpoint DNS
  - `REALTIME_DNS`: Realtime WebSocket endpoint DNS
  - `API_KEY`: Generated API key (only present when `AuthorizationType.API_KEY` is configured)
