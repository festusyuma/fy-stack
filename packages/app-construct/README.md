# @fy-stack/app-construct

Compute and static hosting AWS CDK constructs for `@fy-stack`. Supports deploying applications to **AWS Lambda**, **Amazon ECS Fargate** (load-balanced services and background tasks), and **Amazon S3 / CloudFront** (static websites and Next.js exports), as well as standalone artifact-publishing constructs for decoupled CI/CD pipelines.

## Installation

```bash
npm install @fy-stack/app-construct
```

---

## Construct Overview

| Export | Description |
|---|---|
| `LambdaConstruct` | Deploys a map of named Lambda applications (`NODE_APP`, `NODE_API`, `IMAGE_APP`, `NEXT_APP_ROUTER`). |
| `EcsConstruct` | Provisions an ECS cluster (Container Insights disabled by default, configurable via `cluster`), an ALB-backed Fargate service (`server`), and event-driven Fargate task definitions (`tasks`). |
| `StaticConstruct` | Deploys a map of static applications (`NEXT_PAGE_EXPORT`, `STATIC_WEBSITE`) to S3 for serving via CloudFront. |
| `ImageAppContainer` | Standalone construct that builds & pushes a Docker image to ECR and writes versioned parameters to SSM. |
| `NextAppRouterCode` | Standalone construct that uploads Next.js standalone server code & static/public assets to S3 and records keys in SSM. |
| `NextAppRouterContainer` | Standalone construct that pushes a Next.js Docker image to ECR, uploads static/public assets to S3, and records keys in SSM. |
| `NextPagesExportCode` | Standalone construct that uploads Next.js static export assets to S3 and records keys in SSM. |
| `NodeApiCode` | Standalone construct that writes a `run.sh` startup script, packages a Node API to S3, and records keys in SSM. |
| `NodeAppCode` | Standalone construct that packages a Node.js Lambda application to S3 and records keys in SSM. |
| `StaticWebsiteCode` | Standalone construct that uploads static website files to S3 and records keys in SSM. |
| `lambdaAttach` / `lambdaGrant` | Helper functions for attaching `Attachable` env vars and granting `Grantable` permissions to a `lambda.Function`. |

---

## Application Source Modes

All app constructs support two source modes:

1. **Local Build Output (`output`):** Builds and deploys directly from a local directory path during `cdk deploy`.
2. **Decoupled Artifact Reference (`reference` & `version`):** Reads artifact locations (S3 bucket/keys or ECR repository/tag) from SSM Parameter Store at `/<reference>/<version || 'latest'>/...` published by one of the Standalone constructs.

---

## `LambdaConstruct`

Deploys one or more Lambda applications sharing a CloudWatch `ILogGroup` and optional VPC.

```ts
new LambdaConstruct(scope, 'Lambda', {
  logGroup,
  vpc, // IVpc or () => IVpc
  apps: {
    api: {
      type: AppType.NODE_API,
      output: 'dist/apps/api',
      cmd: 'node main.js',
      timeout: 30,
      buildParams: { memorySize: 512 },
    },
  },
});
```

### Supported Lambda App Types

| `AppType` | Runtime / Mechanism | CloudFront | API Gateway | Event (SNS) | SQS Queue |
|---|---|---|---|---|---|
| `NODE_APP` | `NODEJS_20_X` (default handler `index.handler`) | No | Yes (`HttpLambdaIntegration`) | Yes (SQS if `queue` set, else direct Lambda) | Yes |
| `NODE_API` | `NODEJS_20_X` + AWS Lambda Web Adapter layer (`PORT=8080`, `run.sh`) | Yes (`FunctionUrlOrigin`) | Yes (`HttpUrlIntegration`) | No | Yes |
| `IMAGE_APP` | `Runtime.FROM_IMAGE` (`LINUX_AMD64`) | Yes (`FunctionUrlOrigin`) | Yes (`HttpUrlIntegration`) | Yes (SQS if `queue` set, else direct Lambda) | Yes |
| `NEXT_APP_ROUTER` | `NODEJS_20_X` + AWS Lambda Web Adapter (`RESPONSE_STREAM`) + S3 static/public assets (see [Static Assets & Base Paths](#static-assets--base-paths)) | Yes (`FunctionUrlOrigin` + S3 static behaviors + `/fy-stack/ImagePolicyID` cache policy) | Yes (`HttpUrlIntegration` for app, image, `_next`, and `public`) | No | No |

Each deployed app in `lambdaConstruct.apps[name]` exposes:
- `function: lambda.Function`
- `queue?: sqs.Queue`
- `attach(attachable)`, `grant(...grantables)`, `cloudfront(path)`, `api(path)`, `subscription(props)`

Apps exposed over HTTP create a single Function URL, shared by `cloudfront()` and `api()`.

---

## `EcsConstruct`

Provisions an ECS `Cluster` and optionally creates a multi-container Fargate service (`server`, instance of `EcsServerConstruct`) and/or standalone background Fargate task definitions (`tasks`).

```ts
new EcsConstruct(scope, 'Ecs', {
  vpc,
  logGroup,
  environment: 'production',
  environmentPath: '/my-app/production',
  cluster: { containerInsightsV2: ecs.ContainerInsights.ENABLED },
  server: {
    definition: { cpu: 512, memoryLimitMiB: 1024 },
    assignPublicIp: false,
    healthCheck: { interval: 30 },
    loadBalancer: { internal: true },
    apps: {
      web: {
        type: AppType.REACT_ROUTER,
        output: 'build',
        port: 3000,
        healthPath: '/health',
      },
      admin: {
        type: AppType.REACT_ROUTER,
        output: 'apps/admin/build',
        port: 3001,
        healthPath: '/admin/health',
      },
    },
  },
  tasks: {
    worker: {
      type: AppType.IMAGE_APP,
      output: 'apps/worker',
    },
  },
});
```

### `EcsServerConstruct` (`ecs.server`)

All apps run as containers in one Fargate service and are reached through CloudFront -> ALB. Each app gets its own target group and listener rule matching the `proxy-path` header (`<environmentPath>/<appKey>`), which CloudFront adds as an origin custom header together with `x-original-proto: https`. Requests without a matching header get a `400` from the listener's default action.

- **Supported Server App Types:**
  - `AppType.IMAGE_APP`: Containerized HTTP service (`${path}/*`).
  - `AppType.NEXT_APP_ROUTER`: Containerized Next.js server + S3 static (`/_next/*`, `/*.*`) and image (`/_next/image`) CloudFront behaviors.
  - `AppType.REACT_ROUTER`: Containerized React Router server + S3 client assets (`/assets/*`, `/*.*`) and data (`/*.data`) CloudFront behaviors.
- **Load Balancer:**
  - Pass `ApplicationLoadBalancerProps` (without `vpc`/`internetFacing`) to create a new ALB. It is internet-facing by default; set `internal: true` to place it in private subnets and reach it through a CloudFront VPC origin.
  - Pass `{ arn, priorityRange: [min, max], priorityOverride? }` to share an existing ALB's HTTP:80 listener across stacks/environments. Add `internal: true` (and optionally `vpcOriginArn` to reuse an existing VPC origin) when that ALB is internal.
  - The ALB, target group and listener rule are created when the app is first attached to a CDN. Set `connectLoadBalancer: true` on an app to create them without a CDN.
- **Listener Rule Priorities:**
  - Tracked per app path in `./fy-stack.context.json` and reused on later deploys; commit this file.
  - New priorities are allocated from `priorityRange` (default `[1000, 1999]` for a newly created ALB).
  - Renaming an app key changes its `proxy-path`; until the CloudFront update propagates, edges still send the old value and receive `400`s.
- **Health Checks:**
  - Configurable at the server level via `server.healthCheck` (with `interval` in seconds, default `30`) and per app via `app.healthPath`.
  - `healthPath` is the full path the container serves, including any base path (e.g. `/admin/health` for an app mounted at `/admin`). Default: `server.healthCheck.path`, then `'/'`.
  - A failing health check triggers the deployment circuit breaker, which rolls back the shared service.

### Static Assets & Base Paths

Applies to `REACT_ROUTER` (ECS) and `NEXT_APP_ROUTER` (ECS and Lambda).

- Static files are deployed to the root of the app's static bucket. For apps mounted on a sub-path (e.g. `/admin`), a CloudFront viewer-request function strips the base path from **static** requests only (`/admin/assets/x.js` -> `assets/x.js`). Server requests keep the full path.
- The app must therefore be built for its mount path:
  - React Router: `basename: '/admin/'` in `react-router.config.ts` and `base: '/admin/'` in `vite.config.ts`.
  - Next.js: `basePath: '/admin'` in `next.config.js`.
- Files are deployed in two steps so in-flight clients keep working during a rollout:
  1. New files are uploaded without deleting anything, before the task definition / Lambda function is updated.
  2. Once the ECS service has stabilised (or the Lambda function is updated), a second sync prunes files that are no longer part of the build. If the ECS deployment fails and rolls back, the prune never runs.
- Next.js public files are pruned with `_next/*` excluded, so `_next/static` is only managed by its own deployment.

### `TaskConstruct` (`ecs.tasks`)

- Provisions a `FargateTaskDefinition` for `AppType.IMAGE_APP`.
- Implements `EventResource`, `Grant`, and `Attach`.
- When subscribed to an event in `EventConstruct`, creates an SQS queue and an EventBridge Pipe (`CfnPipe`) that launches the Fargate task with `TASK_NAME` (`$.body.message`) and `PAYLOAD` (`$.body.payload`) environment overrides.

---

## `StaticConstruct`

Deploys static sites to S3 buckets configured for website hosting and provides CloudFront behaviors:

- **`AppType.NEXT_PAGE_EXPORT` (`NextPagesExportConstruct`):** Deploys `.next` and `public` assets to S3 and routes `${path}/*` via CloudFront `S3StaticWebsiteOrigin`.
- **`AppType.STATIC_WEBSITE` (`StaticWebsiteConstruct`):** Deploys static assets to S3. Supports `buildParams: { spa: true }`, which attaches a CloudFront Viewer Request Function to redirect non-trailing-slash URLs and rewrite route paths to `/index.html`.

---

## Standalone Artifact Constructs

Use these constructs in a build/publish stack to upload versioned artifacts to S3/ECR and record their locations under `/<stackName>/<version>/...` and `/<stackName>/latest/...` in SSM Parameter Store (with `RemovalPolicy.RETAIN`):

- **`ImageAppContainer`**: Builds a Docker image asset, deploys it to ECR via `cdk-ecr-deployment`, and stores `repository`, `tag`, and `cmd` in SSM.
- **`NextAppRouterCode`**: Packages `.next/standalone` (with `run.sh`), `.next/static`, and `public` to S3 and stores bucket/object keys in SSM.
- **`NextAppRouterContainer`**: Builds & pushes a Docker image to ECR, uploads `.next/static` and `public` to S3, and stores parameters in SSM.
- **`NextPagesExportCode`**: Uploads `.next` and `public` archives to S3 and stores keys in SSM.
- **`NodeAppCode`** / **`NodeApiCode`**: Packages Lambda code to S3 and stores `artifacts`, `code`, `code/handler`, and `tag` in SSM.
- **`StaticWebsiteCode`**: Uploads static website archives to S3 and stores `artifacts`, `files/key`, and `tag` in SSM.
