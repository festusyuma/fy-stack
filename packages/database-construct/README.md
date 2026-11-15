# @fy-stack/database-construct

## `DatabaseConstruct`

`DatabaseConstruct` provisions an Amazon RDS `DatabaseInstance` inside a VPC along with its generated Secrets Manager credentials secret. It implements the `Attachable` and `Grantable` interfaces from `@fy-stack/types`.

## Installation

```bash
npm install @fy-stack/database-construct
```

## Public Properties

- **`db: rds.DatabaseInstance`** — The provisioned RDS database instance.
- **`secrets: secretsManager.ISecret`** — The Secrets Manager secret containing the master credentials for the RDS instance.

## Constructor & Props (`DatabaseConstructProps`)

```ts
new DatabaseConstruct(scope: Construct, id: string, props: DatabaseConstructProps)
```

`DatabaseConstructProps` extends `Omit<rds.DatabaseInstanceProps, 'instanceType' | 'databaseName' | 'publiclyAccessible' | 'engine' | 'vpc'>` with the following properties:

| Property | Type | Default | Description |
|---|---|---|---|
| `vpcId` | `string` | Default VPC | ID of an existing VPC to look up. If omitted, looks up the account's default VPC. |
| `engine` | `rds.IInstanceEngine` | `DatabaseInstanceEngine.POSTGRES` | RDS database instance engine. |
| `instance` | `{ class: ec2.InstanceClass; size: ec2.InstanceSize }` | `T4G.MICRO` | EC2 instance class and size for the RDS instance. |
| `public` | `boolean` | `false` | When `true`, makes the database publicly accessible in `PUBLIC` subnets; otherwise places it in `PRIVATE_ISOLATED` subnets. |
| `useDefault` | `boolean` | — | Optional flag for default database configuration. |

## Methods

### `attachable()`

Returns the database instance and credentials secret identifiers:

| Key | Value |
|---|---|
| `ARN` | RDS database instance ARN |
| `SECRET_ARN` | Master credentials secret ARN |
| `SECRET_NAME` | Master credentials secret name |

### `grantable(grant: iam.IGrantable)`

- Calls `this.db.grantConnect(grant)` to allow RDS connection.
- Grants `secretsmanager:GetSecretValue` on `this.secrets.secretArn`.

### `createDatabase(username: string, dbName: string)`

Creates and returns a `DatabaseUserConstruct` instance that provisions a `DatabaseSecret` rotated/linked with the master secret and attached to the RDS instance.

## `DatabaseUserConstruct`

Implements `Attachable`.

- **Properties**
  - `secrets: secretsManager.ISecret` — The user-specific `DatabaseSecret` attached to the RDS instance.
  - `dbName: string` — The database name.
- **`attachable()`**
  - Returns `{ DB_NAME, SECRET_ARN, SECRET_NAME }`.
