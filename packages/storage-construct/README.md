# Storage Construct Documentation

## `StorageConstruct`

The `StorageConstruct` class is a specialized construct in the AWS CDK that sets up an S3 bucket. This construct implements the `Attachable`, `Grantable`, and `CDNResource` interfaces.

- **Properties**
    - `bucket: s3.IBucket`
        - The S3 bucket managed by this construct.

- **Constructor**
    - `constructor(scope: Construct, id: string, props: StorageConstructProps)`
        - Initializes the storage construct with a unique identifier and configuration options defined by `StorageConstructProps`.

