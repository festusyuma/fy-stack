# @fy-stack/storage-construct

## `StorageConstruct`

`StorageConstruct` is an AWS CDK construct that provisions a private S3 bucket with CORS pre-configured (`GET`, `PUT`, `DELETE` from `*`, exposing `ETag`), an optional pay-per-request DynamoDB log table, and CloudFront Origin Access Control (OAC) integration via `StorageCdnStack`.

This construct implements the `Attachable`, `Grantable`, and `CDNResource` interfaces from `@fy-stack/types`.

## Installation

```bash
npm install @fy-stack/storage-construct
```

## Public Properties

- **`bucket: s3.IBucket`** — The S3 bucket managed by this construct (`BlockPublicAccess.BLOCK_ALL`).
- **`table: dynamodb.Table | undefined`** — Optional DynamoDB table (partition key `key: STRING`, `PAY_PER_REQUEST` billing) created when `props.logTable` is `true`.

## Constructor & Props (`StorageConstructProps`)

```ts
new StorageConstruct(scope: Construct, id: string, props: StorageConstructProps)
```

| Property | Type | Default | Description |
|---|---|---|---|
| `retainOnDelete` | `boolean` | `false` | When `true`, sets `RemovalPolicy.RETAIN` on the S3 bucket. When `false`, sets `RemovalPolicy.DESTROY` and `autoDeleteObjects: true`. |
| `logTable` | `boolean` | `false` | When `true`, creates a DynamoDB table (`LogTable`) with string partition key `key`. |

## Methods

### `cloudfront(path: string, key?: cloudfront.KeyGroup)`

Creates a nested `StorageCdnStack` that configures an `S3OriginAccessControl` and `S3BucketOrigin` for the bucket, marks the construct as linked to a CDN (`CDN_LINK = "true"`), and returns a CloudFront behavior mapping for `${path}/*`:

- Compression enabled, `CachePolicy.CACHING_OPTIMIZED`, `ALLOW_GET_HEAD`, `REDIRECT_TO_HTTPS`.
- Attaches `[key]` to `trustedKeyGroups` when a `KeyGroup` is passed (for signed URLs).

### `cloudfrontPolicy(distributionId: string)`

Returns an IAM policy statement JSON object granting `cloudfront.amazonaws.com` permission to perform `s3:GetObject` on `${bucketArn}/*` scoped to the given CloudFront `distributionId`.

### `attachable()`

Returns a map of storage metadata:

| Key | Value |
|---|---|
| `NAME` | S3 bucket name |
| `DOMAIN` | S3 bucket domain name |
| `ARN` | S3 bucket ARN |
| `LOG_TABLE` | DynamoDB log table name (or `""` if not enabled) |
| `CDN_LINK` | `"true"` if `cloudfront()` was called, otherwise `"false"` |

### `grantable(grant: iam.IGrantable)`

- Grants `s3:*` on `${bucketArn}/*` to the given principal.
- If `logTable` is enabled, also grants full DynamoDB access (`table.grantFullAccess(grant)`).

## `StorageCdnStack`

A CDK `NestedStack` exported by this package that sets up an `S3OriginAccessControl` and `S3BucketOrigin` for a given `bucketArn` (`StorageCdkStackProps`).
