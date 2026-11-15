# FyStack

A library of AWS CDK constructs and a CLI for provisioning full-stack app infrastructure — auth, storage, database, compute (Lambda & ECS), static hosting, CDN, API Gateway, events, and secrets — all from one props object.

This is an [Nx](https://nx.dev) monorepo. Each package below is independently published to npm under the `@fy-stack` scope.

## Packages

### Full stack

| Package | Description |
|---|---|
| [`@fy-stack/fullstack-construct`](packages/fullstack-construct/README.md) | High-level construct that wires together the full suite of `@fy-stack` constructs into a single, unified infrastructure definition. |

### Infrastructure constructs

| Package | Description |
|---|---|
| [`@fy-stack/auth-construct`](packages/auth-construct/README.md) | Amazon Cognito user pool, custom/hosted domain, client, managed login branding, and user groups. |
| [`@fy-stack/storage-construct`](packages/storage-construct/README.md) | S3 bucket with CORS, optional DynamoDB log table, and CloudFront OAC integration. |
| [`@fy-stack/database-construct`](packages/database-construct/README.md) | RDS database instance and user credentials managed in Secrets Manager. |
| [`@fy-stack/secret-construct`](packages/secret-construct/README.md) | Secrets Manager secret aggregating attached resource attributes and static secrets. |
| [`@fy-stack/event-construct`](packages/event-construct/README.md) | SNS topic & EventBridge scheduled event routing (`EventConstruct`) plus AppSync Event WebSocket APIs (`WebsocketConstruct`). |
| [`@fy-stack/apigateway-construct`](packages/apigateway-construct/README.md) | HTTP API Gateway with CORS preflight and route integrations. |
| [`@fy-stack/cdn-construct`](packages/cdn-construct/README.md) | CloudFront distribution with multi-zone ACM certificates, Route53 records, and signed URL key groups. |
| [`@fy-stack/app-construct`](packages/app-construct/README.md) | Compute constructs for Lambda and ECS Fargate, static site deployment, and standalone artifact publishers. |
| [`@fy-stack/task-construct`](packages/task-construct/README.md) | Fargate task definitions triggered via SNS, SQS, and EventBridge Pipes. |

### Shared

| Package | Description |
|---|---|
| [`@fy-stack/types`](packages/types/README.md) | Shared interfaces (`Attachable`, `Attach`, `Grantable`, `Grant`, `CDNResource`, `EventResource`, `ApiResource`), types (`ResourceRef`, `Domain`, `StackContext`), and enums (`AppType`, `AppGrant`). |

### CLI

| Package | Description |
|---|---|
| [`@fy-stack/cli`](packages/cli/README.md) | `fy-stack init` scaffolds application infrastructure, AWS OIDC + GitHub Actions deployment workflows, and CloudFront image cache policies. |

## Quick start

```bash
npm install @fy-stack/fullstack-construct
```

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

See [`@fy-stack/fullstack-construct`](packages/fullstack-construct/README.md) for the full props reference, or use individual construct packages directly for finer-grained control.

## Development

```bash
nx build <package>              # build a single package
npm publish --access public --workspaces   # publish all packages
```

## License

MIT

[//]: # (nx g @nx/js:lib packages/fullstack-construct --publishable=true --importPath=@fy-stack/fullstack-construct)

[//]: # (npm version 0.0.125 --workspaces --workspaces-update)

[//]: # (npm publish --access public --workspaces)
