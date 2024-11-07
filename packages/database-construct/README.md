# Database Construct Documentation

## `DatabaseConstruct`

Represents a database construct that provisions an RDS database instance along with associated secrets. This class implements both `Attachable` and `Grantable` interfaces.

- **Properties**
    - `dbSecrets: ISecret`
        - Stores the secrets related to the database instance.
    - `db: DatabaseInstance`
        - The provisioned RDS database instance.
    - `dbName: string`
        - The name assigned to the database instance.

- **Constructor**
    - `constructor(scope: Construct, id: string, props: DatabaseConstructProps)`
        - Initializes the database construct with a unique identifier and configuration options defined by `DatabaseConstructProps`.

[//]: # (    - For further details, see the project’s documentation [here]&#40;https://github.com/festusyuma/fy-stack/blob/main/packages/types/README.md&#41;.)
