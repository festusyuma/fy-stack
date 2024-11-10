# Secrets Construct Documentation

## `SecretsConstruct`

A construct that manages and encapsulates AWS Secrets Manager secrets. This construct implements the `Attachable` and `Grantable` interfaces.

- **Properties**
    - `secrets: secretsManager.Secret`
        - The AWS Secrets Manager secret managed by this construct.

- **Constructor**
    - `constructor(scope: Construct, id: string, props: SecretConstructProps)`
        - Initializes the secrets construct with a unique identifier and configuration options defined by `SecretConstructProps`.
