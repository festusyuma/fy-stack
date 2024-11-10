
# CDN Construct Documentation

## `CDNConstruct`

The `CDNConstruct` class is a custom AWS CDK construct that sets up a CloudFront distribution based on the provided routing and resource configurations.

- **Properties**
    - `distribution: cloudfront.Distribution`
        - The CloudFront distribution managed by this construct.

- **Constructor**
    - `constructor(scope: Construct, id: string, props: CDNConstructProps)`
        - Initializes the CDN construct with a unique identifier and configuration options defined by `CDNConstructProps`.
        - **Parameters**
            - `scope`: The scope in which this construct is defined.
            - `id`: The unique identifier for this construct.
            - `props`: Properties required to set up the CDN construct, including route mappings and resource configurations.

