# @fy-stack/apigateway-construct

## `ApiGatewayConstruct`

`ApiGatewayConstruct` provisions an Amazon API Gateway HTTP API (`HttpApi`) with permissive CORS preflight settings (`allowHeaders: ['*']`, `allowOrigins: ['*']`, `allowMethods: [CorsHttpMethod.ANY]`) and wires routes to `ApiResource` constructs.

This construct implements the `Attachable` interface from `@fy-stack/types`.

## Installation

```bash
npm install @fy-stack/apigateway-construct
```

## Public Properties

- **`api: apigatewayv2.HttpApi`** — The underlying `HttpApi` instance managed by this construct.

## Constructor & Props (`ApiGatewayConstructProps`)

```ts
new ApiGatewayConstruct(scope: Construct, id: string, props: ApiGatewayConstructProps)
```

| Property | Type | Description |
|---|---|---|
| `routes` | `Record<string, ResourceRef>` | Map of route path prefixes to `ResourceRef` objects (`{ $resource: string }`). Must include a `'/*'` base route whose resource supplies a default integration (`''`). |
| `resources` | `Record<string, ApiResource \| undefined>` | Map of resource names to `ApiResource` instances referenced by `routes`. |

### Route Resolution & Error Handling

- Throws `Error('"<name>" resource not found')` if a `$resource` key in `routes` does not exist in `props.resources`.
- Throws `Error('no base route')` if `routes['/*']` is not provided.
- Calls `base.api('')` on the `'/*'` resource and extracts `''` as the `HttpApi` `defaultIntegration` (throws `Error('no default integration')` if missing).
- Calls `resource.api(routeKey)` for all other routes and registers them on the `HttpApi` with `HttpMethod.ANY`.

## Methods

### `attachable()`

Returns the API Gateway endpoint for attachment to other constructs or secrets:

| Key | Value |
|---|---|
| `domain` | `this.api.apiEndpoint` |
