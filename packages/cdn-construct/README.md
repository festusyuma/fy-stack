# @fy-stack/cdn-construct

## `CDNConstruct`

`CDNConstruct` is an AWS CDK construct that provisions an Amazon CloudFront distribution (`PriceClass.PRICE_CLASS_100` with logging enabled), maps route paths to `CDNResource` behaviors, optionally configures a CloudFront `KeyGroup` for private/signed routes, and optionally provisions a multi-zone DNS-validated ACM certificate and Route53 alias records for custom domains.

This construct implements the `Attachable` interface from `@fy-stack/types`.

## Installation

```bash
npm install @fy-stack/cdn-construct
```

## Public Properties

- **`distribution: cloudfront.Distribution`** — The CloudFront distribution managed by this construct.
- **`domainName: string | undefined`** — The primary custom domain name (if `domains` is provided).
- **`publicKey: cloudfront.PublicKey | undefined`** — The CloudFront public key created when `props.key` is provided.
- **`keyGroup: cloudfront.KeyGroup | undefined`** — The CloudFront key group created from `publicKey` for signed URL/cookie verification on `private: true` routes.

## Constructor & Props (`CDNConstructProps`)

```ts
new CDNConstruct(scope: Construct, id: string, props: CDNConstructProps)
```

| Property | Type | Description |
|---|---|---|
| `routes` | `Record<string, ResourceRef & RouteProps>` | Map of route path prefixes to resource references (`{ $resource: string; private?: true }`). Must include a `'/*'` base route whose resource produces a `'/*'` default behavior when `cloudfront('')` is called. |
| `resources` | `Record<string, CDNResource \| undefined>` | Map of resource names to `CDNResource` instances referenced by `routes`. |
| `key` | `string` | Optional file path to a PEM-encoded public key used to create `publicKey` and `keyGroup`. When a route has `private: true`, this `keyGroup` is passed to `resource.cloudfront(path, keyGroup)`. |
| `domains` | `Domain[]` | Optional array of `{ domain: string; records: string[] }` objects. Looks up the corresponding Route53 hosted zones, creates a multi-zone DNS-validated ACM certificate (`CertificateValidation.fromDnsMultiZone`), attaches the domain names to the CloudFront distribution, and creates Route53 `ARecord` aliases (`'*'` maps to the root/apex domain). |

## Methods

### `attachable()`

Returns the distribution's base URL and optional key pair ID:

| Key | Value |
|---|---|
| `DOMAIN` | `'https://' + (this.domainName ?? this.distribution.domainName)` |
| `KEY_PAIR_ID` | `this.publicKey.publicKeyId` (only included when `props.key` is provided) |
