
# Auth Construct Documentation

## `AuthConstruct`

The `AuthConstruct` class is a custom AWS CDK construct that sets up authentication infrastructure using Amazon Cognito. It creates a user pool, a user pool domain, and a user pool client with configurable authentication flows and token validity. Additionally, it can create user groups within the user pool. This construct implements the `Attachable` and `Grantable` interfaces.

- **Properties**
    - `userPool: cognito.UserPool`
        - The Cognito user pool created by this construct.
    - `domain: cognito.UserPoolDomain`
        - The domain associated with the user pool.
    - `client: cognito.UserPoolClient`
        - The client application for the user pool.

- **Constructor**
    - `constructor(scope: Construct, id: string, props: AuthConstructProps)`
        - Initializes the authentication construct with a unique identifier and configuration options defined by `AuthConstructProps`.
        - **Parameters**
            - `scope`: The scope in which this construct is defined.
            - `id`: The unique identifier for this construct.
            - `props`: Properties required to set up the authentication construct.
