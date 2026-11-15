# @fy-stack/secret-construct

## `SecretsConstruct`

`SecretsConstruct` aggregates connection attributes from `Attachable` constructs and custom static key-value pairs into a single AWS Secrets Manager JSON secret (`AppSecrets`).

This construct implements the `Attachable` and `Grantable` interfaces from `@fy-stack/types`.

## Installation

```bash
npm install @fy-stack/secret-construct
```

## Public Properties

- **`secrets: secretsManager.Secret`** — The AWS Secrets Manager secret created by this construct.

## Constructor & Props (`SecretConstructProps`)

```ts
new SecretsConstruct(scope: Construct, id: string, props: SecretConstructProps)
```

| Property | Type | Description |
|---|---|---|
| `resources` | `Record<string, Attachable \| undefined>` | Map of named `Attachable` constructs. Each resource's `attachable()` output is flattened into the secret as `<RESOURCE_KEY>_<ATTRIBUTE_KEY>` in uppercase (e.g. `AUTH_CLIENT_ID`, `STORAGE_NAME`). |
| `secrets` | `Record<string, string \| undefined>` | Static key-value pairs merged directly into the secret JSON object. Note: `region` (set to the stack's AWS region) is always included by default. |

## Methods

### `attachable()`

Returns the secret's identifiers so compute resources can reference it via environment variables:

| Key | Value |
|---|---|
| `ARN` | Secrets Manager secret ARN (`this.secrets.secretArn`) |
| `NAME` | Secrets Manager secret name (`this.secrets.secretName`) |

### `grantable(grant: iam.IGrantable)`

Grants read access (`this.secrets.grantRead(grant)`) on the Secrets Manager secret to the given `IGrantable` principal.
