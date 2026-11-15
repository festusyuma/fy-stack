# @fy-stack/fullstack-construct

A high-level AWS CDK construct that wires together the full suite of `@fy-stack` constructs into a single, unified infrastructure definition. It handles auth, storage, databases, compute (Lambda & ECS), static hosting, CDN, API Gateway, event routing, and secrets — all from one props object.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Props Reference](#props-reference)
  - [name](#name)
  - [environment](#environment)
  - [vpcId](#vpcid)
  - [domain](#domain)
  - [ownerArn](#ownerarn)
  - [outputs](#outputs)
  - [auth](#auth)
  - [storage](#storage)
  - [database](#database)
  - [lambda](#lambda)
  - [ecs](#ecs)
  - [static](#static)
  - [event](#event)
  - [cdn](#cdn)
  - [api](#api)
  - [secret](#secret)
- [Application Types](#application-types)
- [Grants & Attachments](#grants--attachments)
  - [AppGrant](#appgrant)
  - [AppAttachment](#appattachment)
- [ResourceRef](#resourceref)
- [Public Properties](#public-properties)
- [CloudFormation Outputs](#cloudformation-outputs)
- [Examples](#examples)

---

## Installation

```bash
npm install @fy-stack/fullstack-construct
```

The package requires `aws-cdk-lib` and `constructs` as peer dependencies.

---

## Quick Start

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { FullStackConstruct } from '@fy-stack/fullstack-construct';
import { AppType, AppGrant } from '@fy-stack/types';

const app = new App();
const stack = new Stack(app, 'MyStack');

new FullStackConstruct(stack, 'MyApp', {
  name: 'my-app',
  environment: 'production',
  outputs: true,

  auth: {
    groups: ['admin', 'users'],
  },

  storage: {
    retainOnDelete: true,
  },

  lambda: {
    api: {
      type: AppType.NODE_API,
      output: 'dist/apps/api',
      grants: [AppGrant.AUTH, AppGrant.STORAGE],
      attachment: { auth: true, storage: true, secret: true },
    },
  },

  static: {
    web: {
      type: AppType.NEXT_PAGE_EXPORT,
      output: 'dist/apps/web/exported',
    },
  },

  cdn: {
    routes: {
      '/api/*': { $resource: 'api' },
      '/*': { $resource: 'web' },
    },
  },
});
```

---

## Props Reference

### `name`

**Type:** `string` — **Required**

The application name. Used as a prefix for resource names and as the value of the `App` tag applied to all resources.

```typescript
name: 'my-app'
```

---

### `environment`

**Type:** `string` — **Required**

The deployment environment (e.g. `"production"`, `"staging"`, `"dev"`). Used in resource names, SSM parameter paths, and as the value of the `Environment` tag.

```typescript
environment: 'production'
```

---

### `vpcId`

**Type:** `string` — **Optional**

The ID of an existing VPC to use. If omitted, the account's default VPC is used. The VPC is lazily resolved — it is only looked up when a construct actually requires it (database, ECS, or Lambda with VPC).

```typescript
vpcId: 'vpc-0abc1234def56789'
```

---

### `domain`

**Type:** `Domain` (`{ domain: string; records: string[] }`) — **Optional**

Root custom domain configuration shared across authentication and CDN:

- Passed to `AuthConstruct` to provision a custom Cognito domain (`auth[-<domainPrefix>].<domain>`) with a DNS-validated ACM certificate and Route53 alias record.
- Automatically prepended to `cdn.domains` when `cdn` is configured.

```typescript
domain: {
  domain: 'example.com',
  records: ['*'],
}
```

---

### `ownerArn`

**Type:** `string` — **Optional**

The ARN of an IAM user or role to grant ownership permissions over all tagged resources. The owner receives:

- A wildcard (`*`) policy on all resources tagged with the app name and environment.
- Full S3 access on the storage bucket (if storage is configured).

The ARN resource type is parsed automatically — both `arn:aws:iam::123456789012:user/alice` and `arn:aws:iam::123456789012:role/deploy-role` are supported.

```typescript
ownerArn: 'arn:aws:iam::123456789012:role/deploy-role'
```

---

### `outputs`

**Type:** `boolean` — **Optional**

When `true`, CloudFormation outputs are exported for key resource identifiers. See [CloudFormation Outputs](#cloudformation-outputs) for the full list.

```typescript
outputs: true
```

---

### `auth`

**Type:** `Omit<AuthConstructProps, 'environment' | 'appName' | 'domain'>` — **Optional**

Provisions an [Amazon Cognito](https://aws.amazon.com/cognito/) user pool, user pool domain, user pool client, and managed login branding (`CfnManagedLoginBranding`). When omitted, no authentication infrastructure is created.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `groups` | `string[]` | — | Names of Cognito user pool groups to create (with ascending precedence) |
| `signInAliases` | `SignInAliases` | — | Cognito sign-in aliases (e.g. `{ email: true }`) |
| `domainPrefix` | `string[]` | — | Additional prefix segments joined to `auth` when a custom `domain` is configured |
| `token.accessTokenValidity` | `number` | `30` | Access token validity in **minutes** |
| `token.refreshTokenValidity` | `number` | `1440` | Refresh token validity in **minutes** (24 hours) |
| `client` | `Partial<UserPoolClientProps>` | — | Overrides merged into the Cognito `UserPoolClient` |
| `managedLogin` | `Partial<CfnManagedLoginBrandingProps>` | — | Overrides merged into `CfnManagedLoginBranding` (`useCognitoProvidedValues: true` by default) |

```typescript
auth: {
  groups: ['admin', 'moderators', 'users'],
  signInAliases: { email: true },
  token: {
    accessTokenValidity: 60,
    refreshTokenValidity: 1440,
  },
}
```

**Defaults:**
- Self sign-up is enabled.
- Deletion protection is enabled.
- Sign-in is case-insensitive.
- Managed login version: `NEWER_MANAGED_LOGIN`.
- Auth flows: `userPassword`, `userSrp`, `adminUserPassword`.
- Token revocation and client secret generation are enabled.

---

### `storage`

**Type:** `StorageConstructProps` — **Optional**

Provisions an S3 bucket with CORS enabled for `GET`, `PUT`, and `DELETE` requests (`ETag` exposed). All public access is blocked by default.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `retainOnDelete` | `boolean` | `false` | Keep the bucket when the stack is deleted (otherwise `DESTROY` with `autoDeleteObjects: true`) |
| `logTable` | `boolean` | `false` | Create a pay-per-request DynamoDB table (`key` partition key) for access logging |

```typescript
storage: {
  retainOnDelete: true,
  logTable: true,
}
```

---

### `database`

**Type:** `DatabaseConstructProps` — **Optional**

Provisions an RDS database instance inside the VPC. Extends the CDK `DatabaseInstanceProps` with convenience overrides.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `engine` | `IInstanceEngine` | `DatabaseInstanceEngine.POSTGRES` | RDS engine (e.g. `DatabaseInstanceEngine.postgres(...)`) |
| `instance` | `{ class: InstanceClass; size: InstanceSize }` | `T4G.MICRO` | EC2 instance type for the database |
| `public` | `boolean` | `false` | Whether the instance is publicly accessible (`PUBLIC` vs `PRIVATE_ISOLATED` subnets) |
| `useDefault` | `boolean` | — | Use the default database configuration |

All other `DatabaseInstanceProps` fields (except `instanceType`, `databaseName`, `publiclyAccessible`, `engine`, and `vpc` — which are managed internally) are passed through.

```typescript
import { DatabaseInstanceEngine, PostgresEngineVersion } from 'aws-cdk-lib/aws-rds';
import { InstanceClass, InstanceSize } from 'aws-cdk-lib/aws-ec2';

database: {
  engine: DatabaseInstanceEngine.postgres({
    version: PostgresEngineVersion.VER_16,
  }),
  instance: {
    class: InstanceClass.T3,
    size: InstanceSize.MICRO,
  },
}
```

---

### `lambda`

**Type:** `Record<string, LambdaApp>` — **Optional**

A map of named Lambda functions to deploy. Each key becomes the function's logical name and is used as the resource identifier in `cdn.routes`, `api.routes`, and `event.handlers`.

Each entry supports either a local build directory (`output` + `cmd`) or an SSM-backed standalone artifact (`reference` + optional `version`):

| Field | Type | Description |
|-------|------|-------------|
| `type` | `AppType` | One of `NODE_APP`, `NODE_API`, `IMAGE_APP`, `NEXT_APP_ROUTER` |
| `output` | `string` | Path to the built application directory (when deploying from local assets) |
| `cmd` | `string` | Startup command written to `run.sh` (used by `NODE_API`; for `NEXT_APP_ROUTER` pass `buildParams.cmd`) |
| `reference` | `string` | Standalone stack name in SSM Parameter Store (alternative to `output`) |
| `version` | `string` | Artifact version tag in SSM (defaults to `'latest'` when using `reference`) |
| `env` | `Record<string, string>` | Static environment variables injected at deploy time |
| `timeout` | `number` | Function timeout in seconds (default: `30`) |
| `queue` | `{ batchSize?: number } & Partial<QueueProps>` | Attach an SQS queue as an event source |
| `buildParams` | `Partial<FunctionProps> & Record<string, unknown>` | CDK `FunctionProps` overrides (e.g. `memorySize`, `handler`, `cmd`, `container`) |
| `grants` | `AppGrant[]` | Permissions to grant to the function — see [AppGrant](#appgrant) |
| `attachment` | `AppAttachment` | Resources to attach as environment variables — see [AppAttachment](#appattachment) |

```typescript
lambda: {
  api: {
    type: AppType.NODE_API,
    output: 'dist/apps/api',
    cmd: 'node main.js',
    timeout: 30,
    buildParams: {
      memorySize: 512,
    },
    env: {
      NODE_ENV: 'production',
    },
    grants: [AppGrant.AUTH, AppGrant.STORAGE, AppGrant.SECRET],
    attachment: {
      auth: true,
      storage: true,
      secret: true,
    },
  },
  worker: {
    type: AppType.NODE_APP,
    output: 'dist/apps/worker',
    cmd: 'index.handler',
    queue: { batchSize: 5 },
    grants: [AppGrant.DATABASE, AppGrant.SECRET],
    attachment: { database: true, secret: true },
  },
}
```

---

### `ecs`

**Type:** `EcsConfig` — **Optional**

Provisions an ECS cluster with Fargate (Container Insights disabled by default; override with `ecs.cluster`). Supports long-running services behind an Application Load Balancer (`server`) and event-driven background task definitions (`tasks`).

#### `ecs.server`

A single Fargate service with one or more containers behind an ALB. Each app is routed by CloudFront to the ALB with a `proxy-path` origin header matched by its own listener rule. See [`@fy-stack/app-construct`](../app-construct/README.md#ecsserverconstruct-ecsserver) for routing, static asset and base path details.

| Field | Type | Description |
|-------|------|-------------|
| `apps` | `Record<string, ServerApp>` | Container apps to run in the service |
| `loadBalancer` | `{ arn, priorityRange, priorityOverride?, internal?, vpcOriginArn? } \| (ApplicationLoadBalancerProps & { internal? })` | Reuse an existing ALB by ARN or create a new one (internet-facing by default; `internal: true` uses a CloudFront VPC origin) |
| `healthCheck` | `Omit<HealthCheck, 'interval'> & { interval?: number }` | ALB target group health check options (`interval` in seconds, default: `30`) |
| `definition` | `FargateTaskDefinitionProps` | CPU/memory and task definition options (defaults: `256` CPU, `512` MiB) |
| `grants` | `AppGrant[]` | Permissions to grant the server's task role |
| `assignPublicIp` | `boolean` | Assign a public IP and use `PUBLIC` subnets (default: `false`, uses `PRIVATE_WITH_EGRESS`) |

Each `ServerApp` entry supports local (`output`) or SSM (`reference`/`version`) sources:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `AppType.NEXT_APP_ROUTER \| AppType.IMAGE_APP \| AppType.REACT_ROUTER` | Application type |
| `output` | `string` | Path to the built application or Dockerfile directory (or use `reference` & `version`) |
| `port` | `number` | Container port to expose |
| `healthPath` | `string` | Full health check path served by the container, including any base path, e.g. `/admin/health` (default: `healthCheck.path`, then `'/'`) |
| `connectLoadBalancer` | `boolean` | Create the ALB target and listener rule even when the app is not attached to a CDN |
| `env` | `Record<string, string>` | Static environment variables |
| `attachment` | `AppAttachment` | Resources to attach to this specific container |
| `container` | `ContainerDefinitionOptions & { output?: string; image: AssetImageProps }` | Additional CDK container and Docker image asset options |
| `buildParams` | `Record<string, unknown>` | Additional build-time parameters |

#### `ecs.tasks`

A map of Fargate task definitions for background processing (invoked via SNS -> SQS -> EventBridge Pipes when wired in `event.handlers`).

| Field | Type | Description |
|-------|------|-------------|
| `type` | `AppType.IMAGE_APP` | Must be `IMAGE_APP` |
| `output` | `string` | Path to the Dockerfile directory (or use `reference` & `version`) |
| `definition` | `FargateTaskDefinitionProps` | Optional task definition overrides (defaults: `256` CPU, `512` MiB) |
| `env` | `Record<string, string>` | Static environment variables |
| `grants` | `AppGrant[]` | Permissions to grant the task role |
| `attachment` | `AppAttachment` | Resources to attach to this task |
| `container` | `ContainerDefinitionOptions` | Additional CDK container options |

```typescript
ecs: {
  server: {
    definition: {
      cpu: 512,
      memoryLimitMiB: 1024,
    },
    healthCheck: {
      interval: 30,
    },
    loadBalancer: {
      // Create a new ALB (internet-facing unless internal is set):
      internal: true,
    },
    // Or reuse an existing ALB:
    // loadBalancer: {
    //   arn: 'arn:aws:elasticloadbalancing:...',
    //   priorityRange: [1, 50000],
    // },
    grants: [AppGrant.SECRET, AppGrant.STORAGE],
    apps: {
      api: {
        type: AppType.IMAGE_APP,
        output: 'apps/api',
        port: 3000,
        healthPath: '/health',
        attachment: { storage: true, secret: true },
      },
    },
  },
  tasks: {
    migrate: {
      type: AppType.IMAGE_APP,
      output: 'apps/api',
      grants: [AppGrant.DATABASE, AppGrant.SECRET],
      attachment: { database: true, secret: true },
    },
  },
}
```

---

### `static`

**Type:** `Record<string, StaticApp>` — **Optional**

A map of named static site deployments. Each entry is uploaded to S3 and served through CloudFront.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `AppType.NEXT_PAGE_EXPORT \| AppType.STATIC_WEBSITE` | Static app type |
| `output` | `string` | Path to the built static output directory (or use `reference` & `version`) |
| `buildParams` | `Record<string, unknown>` | Additional build parameters (e.g. `{ spa: true }` on `STATIC_WEBSITE` for SPA `/index.html` rewrites) |

```typescript
static: {
  web: {
    type: AppType.NEXT_PAGE_EXPORT,
    output: 'dist/apps/web/exported',
  },
  marketing: {
    type: AppType.STATIC_WEBSITE,
    output: 'dist/apps/marketing',
    buildParams: { spa: true },
  },
}
```

---

### `event`

**Type:** `EventConfig` — **Optional**

Sets up SNS-based message routing between resources and supports scheduled (cron/rate) invocations. Eligible targets are Lambda functions and ECS tasks.

#### `event.handlers`

A list of message handler mappings — which resource should process which message types:

| Field | Type | Description |
|-------|------|-------------|
| `$resource` | `string` | Key of the Lambda or ECS task that handles the messages |
| `messages` | `string[]` | List of message type strings this resource subscribes to |

#### `event.schedule`

A list of schedules that publish `{ message, payload: {} }` to subscribed resources:

| Field | Type | Description |
|-------|------|-------------|
| `messages` | `string[]` | Message types to publish on schedule |
| `cron` | `CronOptions` | AWS Events cron expression |
| `rate` | `Duration` | Fixed rate interval (alternative to `cron`) |
| `expression` | `string` | Raw schedule expression string |

```typescript
event: {
  handlers: [
    { $resource: 'worker', messages: ['user.created', 'order.placed'] },
    { $resource: 'migrate', messages: ['db.migrate'] },
  ],
  schedule: [
    {
      messages: ['db.migrate'],
      cron: { minute: '0', hour: '2', weekDay: 'MON' },
    },
    {
      messages: ['reports.generate'],
      rate: Duration.hours(24),
    },
  ],
}
```

---

### `cdn`

**Type:** `Omit<CDNConstructProps, 'resources'>` — **Optional**

Provisions a CloudFront distribution that routes requests to your Lambda functions, ECS services, static apps, and storage bucket. Must include a `'/*'` base route.

#### `cdn.routes`

A map of URL path patterns to resource references (`ResourceRef & RouteProps`).

| Field | Type | Description |
|-------|------|-------------|
| `$resource` | `string` | Key of the Lambda, ECS server app, static app, or `"storage"` |
| `private` | `true` | Restrict access to signed URLs/cookies using the CloudFront `KeyGroup` created from `cdn.key` |

#### `cdn.key`

**Type:** `string` — **Optional**

Path to a PEM-encoded public key file used to create a CloudFront `PublicKey` and `KeyGroup` for `private: true` routes.

#### `cdn.domains`

Optional custom domain configurations (in addition to the top-level `domain` prop, if set):

| Field | Type | Description |
|-------|------|-------------|
| `domain` | `string` | The root domain name |
| `records` | `string[]` | Subdomains to map (use `"*"` for the root/apex domain) |

```typescript
cdn: {
  key: './keys/cloudfront-public-key.pem',
  routes: {
    '/api/*': { $resource: 'api' },
    '/assets/*': { $resource: 'storage', private: true },
    '/*': { $resource: 'web' },
  },
  domains: [
    {
      domain: 'example.com',
      records: ['www', '*'],
    },
  ],
}
```

When both `storage` and `cdn` are configured, a CloudFront bucket policy is automatically generated and exported as the `storageBucketCDNPolicy` CloudFormation output.

---

### `api`

**Type:** `{ routes: Record<string, ResourceRef> }` — **Optional**

Provisions an HTTP API Gateway and routes requests to `ApiResource` constructs. Must include a `'/*'` base route.

| Field | Type | Description |
|-------|------|-------------|
| `routes` | `Record<string, ResourceRef>` | Map of route keys to resource references |

```typescript
api: {
  routes: {
    '/*': { $resource: 'api' },
  },
}
```

---

### `secret`

**Type:** `Record<string, string | undefined>` — **Optional**

Additional key/value pairs to include in the Secrets Manager secret. The following keys are always included automatically:

- `region` / `REGION` — AWS region
- `ENVIRONMENT` — the `environment` prop value

All configured constructs (`auth`, `database`, `storage`, `event`, `cdn`, `api`) also contribute their `attachable()` attributes (prefixed with `AUTH_`, `DATABASE_`, `STORAGE_`, `EVENT_`, `CDN_`, `API_`) to the same secret automatically.

```typescript
secret: {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
}
```

---

## Application Types

The `AppType` constant (from `@fy-stack/types`) defines all supported application types:

| Constant | Value | Runtimes | Description |
|----------|-------|----------|-------------|
| `AppType.NODE_APP` | `"nodeApp"` | Lambda | General-purpose Node.js Lambda application |
| `AppType.NODE_API` | `"nestApi"` | Lambda | Node.js HTTP API (e.g. NestJS) running with AWS Lambda Web Adapter |
| `AppType.IMAGE_APP` | `"imageApp"` | Lambda, ECS | Docker image-based application |
| `AppType.NEXT_APP_ROUTER` | `"nextAppRouter"` | Lambda, ECS | Next.js with App Router (server-rendered + S3 static assets) |
| `AppType.REACT_ROUTER` | `"reactRouter"` | ECS | React Router server-rendered application (+ S3 client assets) |
| `AppType.NEXT_PAGE_EXPORT` | `"nextPageExport"` | Static | Next.js with static export |
| `AppType.STATIC_WEBSITE` | `"staticWebsite"` | Static | Plain HTML/CSS/JS static site or SPA |

```typescript
import { AppType } from '@fy-stack/types';
```

---

## Grants & Attachments

Two mechanisms control how compute resources (Lambda, ECS) interact with infrastructure resources (Auth, Storage, Database, Secrets).

### AppGrant

`AppGrant` (from `@fy-stack/types`) grants IAM permissions to a Lambda function or ECS task role. The construct automatically resolves the grant to the correct resource.

| Constant | Value | Grants Access To |
|----------|-------|-----------------|
| `AppGrant.AUTH` | `"auth"` | Cognito user pool (read/write operations) |
| `AppGrant.STORAGE` | `"storage"` | S3 bucket (read/write) |
| `AppGrant.DATABASE` | `"database"` | RDS database credentials and connection |
| `AppGrant.SECRET` | `"secret"` | Secrets Manager secret (read) |
| `AppGrant.EVENT` | `"event"` | SNS topic (publish) |

```typescript
import { AppGrant } from '@fy-stack/types';

lambda: {
  api: {
    type: AppType.NODE_API,
    output: 'dist/apps/api',
    grants: [AppGrant.AUTH, AppGrant.STORAGE, AppGrant.SECRET],
  },
}
```

### AppAttachment

`AppAttachment` injects configuration values from a resource into a compute resource's environment variables at deploy time. Set a key to `true` to attach that resource's `attachable()` values.

| Field | Type | Injects |
|-------|------|---------|
| `auth` | `boolean` | Cognito user pool ID, client ID, and domain |
| `storage` | `boolean` | S3 bucket name and region |
| `database` | `boolean` | Database host, port, name, and credentials secret ARN |
| `secret` | `boolean` | Secrets Manager secret name and ARN |

```typescript
lambda: {
  api: {
    type: AppType.NODE_API,
    output: 'dist/apps/api',
    attachment: {
      auth: true,
      storage: true,
      secret: true,
    },
  },
}
```

> **Note:** Granting permissions (`grants`) and attaching configuration (`attachment`) are independent. You typically need both — a grant for IAM access and an attachment for the runtime configuration values.

---

## ResourceRef

A `ResourceRef` (from `@fy-stack/types`) is a pointer to a named resource used in `cdn.routes` and `api.routes`. It has a single field:

| Field | Type | Description |
|-------|------|-------------|
| `$resource` | `string` | The key of the resource to reference |

Valid values for `$resource` are:

- Any key in `lambda` (Lambda function)
- Any key in `ecs.server.apps` (ECS container app)
- Any key in `static` (static website)
- `"storage"` (the S3 storage bucket — CDN only)

```typescript
cdn: {
  routes: {
    '/api/*': { $resource: 'api' },   // references lambda.api
    '/*':     { $resource: 'web' },   // references static.web
  },
}
```

---

## Public Properties

After instantiation, `FullStackConstruct` exposes the following properties for downstream use:

| Property | Type | Description |
|----------|------|-------------|
| `vpc` | `ec2.IVpc \| undefined` | The VPC (resolved lazily) |
| `owner` | `iam.IUser \| iam.IRole \| undefined` | The owner IAM principal |
| `auth` | `AuthConstruct \| undefined` | Cognito construct |
| `storage` | `StorageConstruct \| undefined` | S3 storage construct |
| `storagePolicy` | `string \| undefined` | CloudFront bucket policy JSON string |
| `database` | `DatabaseConstruct \| undefined` | RDS database construct |
| `event` | `EventConstruct \| undefined` | Event/SNS construct |
| `ecs` | `EcsConstruct \| undefined` | ECS cluster construct |
| `lambda` | `LambdaConstruct \| undefined` | Lambda functions construct |
| `static` | `StaticConstruct \| undefined` | Static sites construct |
| `cdn` | `CDNConstruct \| undefined` | CloudFront distribution construct |
| `api` | `ApiGatewayConstruct \| undefined` | API Gateway construct |
| `secret` | `SecretsConstruct` | Secrets Manager construct (always present) |

```typescript
const fullstack = new FullStackConstruct(stack, 'App', props);

// Access the CloudFront distribution
const distributionId = fullstack.cdn?.distribution.distributionId;

// Access the Secrets Manager secret
const secretArn = fullstack.secret.secrets.secretArn;
```

---

## CloudFormation Outputs

When `outputs: true` is set, the following CloudFormation outputs are exported:

| Key | Condition | Value |
|-----|-----------|-------|
| `cdnURl` | `cdn` configured | `https://<cloudfront-domain>` |
| `apiUrl` | `api` configured | API Gateway invoke URL |
| `appSecrets` | Always | Secrets Manager secret name |
| `storageBucketCDNPolicy` | `storage` + `cdn` configured | CloudFront bucket policy JSON |

A CloudWatch log group is always created at `{name}-{environment}-logs` with a one-week retention and destroy removal policy.

---

## Examples

### Serverless API + Static Frontend

A typical setup with a NestJS Lambda API, a Next.js static frontend, Cognito auth, S3 storage, and a CloudFront CDN:

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { FullStackConstruct } from '@fy-stack/fullstack-construct';
import { AppType, AppGrant } from '@fy-stack/types';

const app = new App();
const stack = new Stack(app, 'MyAppStack', {
  env: { account: '123456789012', region: 'us-east-1' },
});

new FullStackConstruct(stack, 'MyApp', {
  name: 'my-app',
  environment: 'production',
  outputs: true,

  auth: {
    groups: ['admin', 'users'],
  },

  storage: {
    retainOnDelete: true,
  },

  lambda: {
    api: {
      type: AppType.NODE_API,
      output: 'dist/apps/api',
      timeout: 30,
      buildParams: {
        memorySize: 512,
      },
      grants: [AppGrant.AUTH, AppGrant.STORAGE, AppGrant.SECRET],
      attachment: {
        auth: true,
        storage: true,
        secret: true,
      },
    },
  },

  static: {
    web: {
      type: AppType.NEXT_PAGE_EXPORT,
      output: 'dist/apps/web/exported',
    },
  },

  cdn: {
    routes: {
      '/api/*': { $resource: 'api' },
      '/assets/*': { $resource: 'storage' },
      '/*': { $resource: 'web' },
    },
  },

  secret: {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  },
});
```

---

### ECS Deployment with Background Tasks

A containerised API on ECS Fargate with a background migration task and SNS-based event scheduling:

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { FullStackConstruct } from '@fy-stack/fullstack-construct';
import { AppType, AppGrant } from '@fy-stack/types';
import { DatabaseInstanceEngine, PostgresEngineVersion } from 'aws-cdk-lib/aws-rds';
import { InstanceClass, InstanceSize } from 'aws-cdk-lib/aws-ec2';

const app = new App();
const stack = new Stack(app, 'MyStack', {
  env: { account: '123456789012', region: 'us-east-1' },
});

new FullStackConstruct(stack, 'MyApp', {
  name: 'my-app',
  environment: 'production',
  outputs: true,

  auth: {
    groups: ['admin'],
  },

  storage: {},

  database: {
    engine: DatabaseInstanceEngine.postgres({
      version: PostgresEngineVersion.VER_16,
    }),
    instance: {
      class: InstanceClass.T3,
      size: InstanceSize.MICRO,
    },
  },

  ecs: {
    server: {
      definition: {
        cpu: 1024,
        memoryLimitMiB: 2048,
      },
      loadBalancer: {},
      grants: [AppGrant.AUTH, AppGrant.STORAGE, AppGrant.SECRET],
      apps: {
        api: {
          type: AppType.IMAGE_APP,
          output: 'apps/api',
          port: 3000,
          attachment: {
            auth: true,
            storage: true,
            database: true,
            secret: true,
          },
        },
      },
    },
    tasks: {
      migrate: {
        type: AppType.IMAGE_APP,
        output: 'apps/api',
        grants: [AppGrant.DATABASE, AppGrant.SECRET],
        attachment: { database: true, secret: true },
      },
    },
  },

  event: {
    handlers: [
      { $resource: 'migrate', messages: ['db.migrate'] },
    ],
    schedule: [
      {
        messages: ['db.migrate'],
        cron: { minute: '0', hour: '3', weekDay: 'MON' },
      },
    ],
  },

  cdn: {
    routes: {
      '/api/*': { $resource: 'api' },
      '/assets/*': { $resource: 'storage' },
    },
  },
});
```

---

### Reusing an Existing Load Balancer

When sharing an ALB across multiple stacks, provide the ARN and a priority range:

```typescript
ecs: {
  server: {
    loadBalancer: {
      arn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/shared-alb/abc123',
      priorityRange: [100, 200],
    },
    apps: {
      api: {
        type: AppType.IMAGE_APP,
        output: 'apps/api',
        port: 3000,
      },
    },
  },
  tasks: {},
}
```

---

### Minimal Static Website

```typescript
new FullStackConstruct(stack, 'Site', {
  name: 'my-site',
  environment: 'production',
  outputs: true,

  static: {
    web: {
      type: AppType.STATIC_WEBSITE,
      output: 'dist/web',
    },
  },

  cdn: {
    routes: {
      '/*': { $resource: 'web' },
    },
    domains: [
      {
        domain: 'example.com',
        records: ['www', '*'],
      },
    ],
  },
});
```
