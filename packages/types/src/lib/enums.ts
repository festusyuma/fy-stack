export const AppType = {
  NODE_APP: 'nodeApp',
  NODE_API: 'nestApi',
  IMAGE_APP: 'imageApp',
  NEXT_APP_ROUTER: 'nextAppRouter',
  NEXT_PAGE_EXPORT: 'nextPageExport',
  STATIC_WEBSITE: 'staticWebsite',
} as const;

export type AppType = (typeof AppType)[keyof typeof AppType];

export const AppGrant = {
  AUTH: 'auth',
  STORAGE: 'storage',
  DATABASE: 'database',
  SECRET: 'secret',
  EVENT: 'event',
} as const;

export type AppGrant = (typeof AppGrant)[keyof typeof AppGrant];