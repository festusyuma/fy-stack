# @fy-stack/auth-construct

## `AuthConstruct`

The `AuthConstruct` class is an AWS CDK construct that provisions authentication infrastructure using Amazon Cognito. It creates a user pool (with deletion protection, self sign-up, and case-insensitive sign-in enabled), a user pool domain (either Cognito-hosted or a custom domain with an ACM certificate and Route53 alias record), a user pool client with configurable authentication flows and token validity, and managed login branding (`CfnManagedLoginBranding`). Optionally, it also provisions user pool groups.

This construct implements the `Attachable` and `Grantable` interfaces from `@fy-stack/types`.

## Installation

```bash
npm install @fy-stack/auth-construct
```

## Public Properties

- **`userPool: cognito.UserPool`** — The Cognito user pool created by this construct.
- **`domain: cognito.UserPoolDomain`** — The domain associated with the user pool (configured with `ManagedLoginVersion.NEWER_MANAGED_LOGIN`).
- **`client: cognito.UserPoolClient`** — The user pool client (`WebClient`) configured with `userPassword`, `userSrp`, and `adminUserPassword` auth flows, token revocation, and a generated client secret.
- **`tokenExpiration: { access: number; refresh: number }`** — Access and refresh token validity in **seconds**, resolved from `props.token` (which is configured in minutes).

## Constructor & Props (`AuthConstructProps`)

```ts
new AuthConstruct(scope: Construct, id: string, props: AuthConstructProps)
```

| Property | Type | Default | Description |
|---|---|---|---|
| `appName` | `string` | *Required* | Application name used to derive the default Cognito domain prefix (`${appName}-${environment}`). |
| `environment` | `string` | *Required* | Environment name used in the default Cognito domain prefix. |
| `signInAliases` | `cognito.SignInAliases` | — | Cognito sign-in aliases (e.g. `{ email: true, username: true }`). |
| `domain` | `Domain` | — | Custom domain configuration (`{ domain: string; records: string[] }`). When provided, looks up the Route53 hosted zone, provisions a DNS-validated ACM certificate, and creates a custom Cognito domain (`auth[-<domainPrefix>].<record>.<domain>`) with a Route53 `ARecord` alias. |
| `domainPrefix` | `string[]` | — | Additional prefix segments joined to `auth` (e.g. `['dev']` -> `auth-dev.<domain>`) when `domain` is configured. |
| `groups` | `string[]` | — | User pool group names to create, assigned ascending precedence (`1..N`) in array order. |
| `token.accessTokenValidity` | `number` | `30` | Access token validity in **minutes**. |
| `token.refreshTokenValidity` | `number` | `1440` | Refresh token validity in **minutes** (24 hours). |
| `client` | `Partial<cognito.UserPoolClientProps>` | — | Additional or overriding `UserPoolClientProps` merged into the user pool client. |
| `managedLogin` | `Partial<cognito.CfnManagedLoginBrandingProps>` | — | Additional or overriding `CfnManagedLoginBrandingProps` merged into the managed login branding resource (`useCognitoProvidedValues: true` by default). |

## Methods

### `attachable()`

Returns a map of attributes for attaching this construct to compute resources or secrets:

| Key | Value |
|---|---|
| `ARN` | User pool ARN |
| `ID` | User pool ID |
| `CLIENT_ID` | User pool client ID |
| `CLIENT_SECRET` | Unwrapped user pool client secret |
| `DOMAIN_NAME` | User pool domain base URL (`this.domain.baseUrl()`) |
| `ACCESS_TOKEN_EXPIRATION` | Access token validity in seconds (as string) |
| `REFRESH_TOKEN_EXPIRATION` | Refresh token validity in seconds (as string) |

### `grantable(grant: iam.IGrantable)`

Grants `cognito-idp:*` and `cognito-identity:*` permissions on the user pool to the given `IGrantable` principal.
