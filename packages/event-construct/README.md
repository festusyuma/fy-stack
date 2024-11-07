# Event Construct Documentation

## `EventConstruct`

The `EventConstruct` class is a specialized construct in the AWS CDK that manages SNS topics and scheduled events. This construct implements the `Attachable` and `Grantable` interfaces.

- **Properties**
    - `topic: sns.Topic`
        - The SNS topic managed by this construct.

- **Constructor**
    - `constructor(scope: Construct, id: string, props: EventConstructProps)`
        - Initializes the event construct with a unique identifier and configuration options defined by `EventConstructProps`.
        - **Parameters**
            - `scope`: The scope in which this construct is defined.
            - `id`: The unique identifier for this construct.
            - `props`: Properties required to set up the event construct.

