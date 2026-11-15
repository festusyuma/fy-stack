# @fy-stack/task-construct

## `TaskConstruct`

`TaskConstruct` provisions an AWS ECS Fargate task definition (`FargateTaskDefinition`) on an existing ECS cluster and wires it to SNS topics via SQS and Amazon EventBridge Pipes (`CfnPipe`) for event-driven background task execution.

This construct implements the `EventResource`, `Grant`, and `Attach` interfaces from `@fy-stack/types`.

## Installation

```bash
npm install @fy-stack/task-construct
```

## Public Properties

- **`role: iam.Role`** — IAM role created by the construct.
- **`taskDefinition: ecs.FargateTaskDefinition`** — The Fargate task definition (defaults to `1024` CPU, `2048` MiB memory, `X86_64` architecture).

## Constructor & Props (`TaskConstructsProps`)

```ts
new TaskConstruct(scope: Construct, id: string, props: TaskConstructsProps)
```

`TaskConstructsProps` extends `ecs.FargateTaskDefinitionProps`:

| Property | Type | Description |
|---|---|---|
| `vpc` | `ec2.IVpc` | VPC in which the Fargate task will be launched. |
| `clusterArn` | `string` | ARN of the target ECS cluster. |
| `output` | `string` | Path to the container build directory used by `ContainerImage.fromAsset`. |
| `env` | `Record<string, string>` | Optional environment variables. |
| `defaultImage` | `Omit<ContainerDefinitionOptions, 'image' \| 'logging'> & { container: AssetImageProps }` | Optional default container configuration (`DefaultImage`) added to the task definition with AWS CloudWatch log streaming (`${id}/task-runner`). |

## Methods

### `subscription(props: SubscriptionProps): ITopicSubscription`

Creates an SQS queue (`TaskQueue`) and an EventBridge Pipe (`TaskPipe`) that polls the queue and launches the Fargate task definition in the VPC's public subnets (`assignPublicIp: 'ENABLED'`), passing `TASK_NAME` (`$.body.message`) and `PAYLOAD` (`$.body.payload`) as container environment overrides on `DefaultImage`. Returns a raw-message-delivery `SqsSubscription` for an SNS topic.

### `grant(...grantables: Grantable[]): void`

Grants permissions from each provided `Grantable` to `this.role`.

### `attach(attachable: Record<string, Attachable>): void`

Flattens each `Attachable` resource's attributes as `<KEY>_<SUBKEY>` (uppercase) and injects them as environment variables into `this.taskDefinition.defaultContainer`.
