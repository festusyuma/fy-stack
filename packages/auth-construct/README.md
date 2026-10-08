
# Auth Construct Documentation

## `AuthConstruct`

The `AuthConstruct` class is a custom AWS CDK construct that sets up authentication infrastructure using Amazon Cognito. It creates a user pool, a user pool domain (optionally on a custom domain with an ACM certificate and Route53 alias record), a user pool client with configurable authentication flows and token validity, and managed login branding. Additionally, it can create user groups within the user pool. This construct implements the `Attachable` and `Grantable` interfaces.

- **Properties**
    - `userPool: cognito.UserPool`
        - The Cognito user pool created by this construct.
    - `domain: cognito.UserPoolDomain`
        - The domain associated with the user pool.
    - `client: cognito.UserPoolClient`
        - The client application for the user pool.
    - `tokenExpiration: { access: number; refresh: number }`
        - Access and refresh token validity, in seconds, resolved from `props.token` (which is specified in minutes).

- **Constructor**
    - `constructor(scope: Construct, id: string, props: AuthConstructProps)`
        - Initializes the authentication construct with a unique identifier and configuration options defined by `AuthConstructProps`.
        - **Parameters**
            - `scope`: The scope in which this construct is defined.
            - `id`: The unique identifier for this construct.
            - `props`: Properties required to set up the authentication construct.
        - **`props`**
            - `appName`, `environment`: Used to derive the default Cognito-hosted domain prefix (`${appName}-${environment}`).
            - `signInAliases?`: Cognito sign-in aliases (e.g. `{ email: true }`).
            - `domain?` / `domainPrefix?`: When `domain` is set, a custom domain (`auth[-domainPrefix].${domain}`) is created with an ACM certificate and a Route53 alias record, instead of the Cognito-hosted domain.
            - `groups?`: User pool group names, created with ascending precedence in the given order.
            - `token?.accessTokenValidity` / `token?.refreshTokenValidity`: Token validity **in minutes** (default: `30` / `1440`).
            - `client?`: Additional/overriding `UserPoolClientProps` merged into the client.

- **`attachable()`**
    - Returns `ARN`, `ID`, `CLIENT_ID`, `CLIENT_SECRET`, `DOMAIN_NAME` (the domain's base URL), `ACCESS_TOKEN_EXPIRATION`, and `REFRESH_TOKEN_EXPIRATION` (the latter two in seconds, as strings).

- **`grantable(grant)`**
    - Grants `cognito-idp:*` and `cognito-identity:*` to the given `IGrantable`.
