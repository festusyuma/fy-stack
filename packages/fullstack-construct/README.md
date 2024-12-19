# Fullstack Construct Documentation

## `FullstackConstruct`

### Example
```typescript
import {
  AppGrant,
  AppType,
  FullStackConstruct,
} from '@fy-stack/fullstack-construct';

new FullStackConstruct(this, 'FullstackApp', {
  appId: `unique-app-id`,
  apps: {
    api: {
      type: AppType.NODE_API,
      output: process.cwd() + '/dist/apps/api',
      buildParams: { command: 'node main.js' },
      attachment: { secrets: true },
      grant: [AppGrant.EVENT, AppGrant.SECRETS],
    },
    eventHandler: {
      type: AppType.NODE_APP,
      output: process.cwd() + '/dist/apps/event-handler',
      buildParams: { handler: 'main.handler' },
      attachment: { secrets: true, queue: { batchSize: 10 } },
      grant: [AppGrant.SECRETS],
    },
    web: {
      type: AppType.NEXT_PAGE_EXPORT,
      output: process.cwd() + '/dist/apps/web',
    },
  },
  secrets: {
    SOME_OTHER_ENV: "envValue"
  },
  events: {
    messages: [
      { messages: [EventType.DAILY_SPOOL], $resource: 'eventHandler' },
    ],
    cron: [
      {
        messages: [EventType.DAILY_SPOOL],
        cron: { hour: '0', minute: '0' },
      },
    ],
  },
  cdn: {
    routes: {
      '/*': { $resource: 'web' },
    },
    domains: [
      { domain: 'example.com', records: ['*', 'www'] }, 
      { domain: 'example.com.ng', records: ['*', 'www'] },
    ],
  },
  api: {
    routes: {
      '/*': { $resource: 'api' },
    }
  }
})
```