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
| [`@fy-stack/auth-construct`](packages/auth-construct/README.md) | Amazon Cognito user pool, domain, and client, with configurable auth flows and user groups. |
| [`@fy-stack/storage-construct`](packages/storage-construct/README.md) | S3 bucket with CORS and CloudFront integration. |
| [`@fy-stack/database-construct`](packages/database-construct/README.md) | RDS database instance with associated Secrets Manager credentials. |
| [`@fy-stack/secret-construct`](packages/secret-construct/README.md) | Secrets Manager secret shared across an application's resources. |
| [`@fy-stack/event-construct`](packages/event-construct/README.md) | SNS topic and scheduled (cron) event routing to Lambda/ECS handlers. |
| [`@fy-stack/apigateway-construct`](packages/apigateway-construct/README.md) | HTTP API Gateway with route mappings and integrations. |
| [`@fy-stack/cdn-construct`](packages/cdn-construct/README.md) | CloudFront distribution that routes requests to compute, static, and storage resources. |
| [`@fy-stack/app-construct`](packages/app-construct/README.md) | Compute constructs for deploying applications to Lambda and ECS Fargate, plus static site deployment. |
| [`@fy-stack/task-construct`](packages/task-construct/README.md) | Fargate task definitions for one-off and background processing. |

### Shared

| Package | Description |
|---|---|
| [`@fy-stack/types`](packages/types/README.md) | Shared interfaces (`Attachable`, `Grantable`, `CDNResource`, `Event`, `ApiResource`, `ResourceRef`) used across all constructs to attach, grant, and integrate resources with each other. |

### CLI

| Package | Description |
|---|---|
| [`@fy-stack/cli`](packages/cli/README.md) | `fy-stack init` scaffolds application infrastructure, with optional GitHub deployment and domain setup. |

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
