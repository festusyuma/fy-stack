# API Gateway Construct Documentation

## `ApiGatewayConstruct`

The `ApiGatewayConstruct` class is a custom AWS CDK construct that sets up an API Gateway with defined routes and integrations. The constructor initializes the API Gateway with default and additional integrations based on the provided properties. It also configures CORS to allow headers, origins, and methods from any source.

- **Properties**
    - `api: HttpApi`
        - The API Gateway instance managed by this construct.

- **Constructor**
    - `constructor(scope: Construct, id: string, props: ApiGatewayConstructProps)`
        - Initializes the API Gateway construct with a unique identifier and configuration options defined by `ApiGatewayConstructProps`.
        - **Parameters**
            - `scope`: The scope in which this construct is defined.
            - `id`: The unique identifier for this construct.
            - `props`: Properties required to set up the API Gateway construct, including route mappings and resource configurations.

- **Error Handling**
    - Throws an error if the base route or default integration is missing.
