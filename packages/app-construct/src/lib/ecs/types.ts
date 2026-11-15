import type { ApiResource, Attach, CDNResource } from '@fy-stack/types';
import { AppType } from '@fy-stack/types';
import type {
  LoadBalancerV2Origin,
  VpcOrigin,
} from 'aws-cdk-lib/aws-cloudfront-origins';
import type { IVpc, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import type {
  AssetImageProps,
  BaseService,
  Cluster,
  ClusterProps,
  ContainerDefinitionOptions,
  FargateServiceProps,
  FargateTaskDefinitionProps,
  TaskDefinition,
} from 'aws-cdk-lib/aws-ecs';
import type {
  ApplicationLoadBalancerProps,
  HealthCheck,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import type { LogGroup } from 'aws-cdk-lib/aws-logs';

export type EcsConstructProps = {
  logGroup: LogGroup;
  environmentPath: string;
  environment: string;
  vpc: IVpc;
  cluster?: Omit<ClusterProps, 'vpc'>;
  server?: Omit<FargateServiceProps, 'cluster' | 'taskDefinition'> & {
    assignPublicIp?: boolean;
    definition?: FargateTaskDefinitionProps;
    apps: Record<string, ServerApp>;
    /**
     *  Load balancer config details,
     * a load balancer is required when CDN is attached and will be created if no arn is present in config.
     * */
    loadBalancer?:
      | ({
          /**
           * Existing load balancer ARN.
           * used for sharing the same load balancer across various applications
           * */
          arn: string;
          /**
           *  This is required as load balancer is shared with other applications.
           *  it helps to be able to create unique priority for environment in this app
           * */
          priorityRange: [number, number];
          priorityOverride?: Record<string, number>;
        } & (
          | object
          | {
              /**
               * If load balancer created or passed is internal
               * */
              internal: true;
              /**
               * Existing cloudfront VPC origin ARN.
               * used for using the same VPC origin on shared internal load balancer
               * */
              vpcOriginArn?: string;
            }
        ))
      | (Omit<ApplicationLoadBalancerProps, 'internetFacing' | 'vpc'> & {
          internal?: true;
        });
    healthCheck?: Omit<HealthCheck, 'interval'> & {
      /**
       * Health check interval in seconds.
       * */
      interval?: number;
    };
  };
  tasks?: Record<string, TaskApp>;
};

export type AppSource =
  | {
      output: string;
      container?: Omit<ContainerDefinitionOptions, 'image' | 'logging'> & {
        output?: string;
        image: AssetImageProps;
      };
    }
  | {
      reference: string;
      version?: string;
      container?: Omit<ContainerDefinitionOptions, 'image' | 'logging'>;
    };

export type ServerApp = {
  type:
    | typeof AppType.NEXT_APP_ROUTER
    | typeof AppType.IMAGE_APP
    | typeof AppType.REACT_ROUTER;
  env?: Record<string, string>;
  /** Additional parameters that may be required, this varies based on type */
  buildParams?: Record<string, unknown>;
  port: number;
  healthPath?: string;
  connectLoadBalancer?: boolean;
} & AppSource;

export type TaskApp = {
  type: typeof AppType.IMAGE_APP;
  env?: Record<string, string>;
  buildParams?: Record<string, unknown>;
  definition?: FargateTaskDefinitionProps;
} & AppSource;

export type AppProperties<BuildParams = Record<string, unknown>> = {
  appName: string;
  environmentPath: string;
  logGroup: LogGroup;
  taskDefinition: TaskDefinition;
  service: BaseService;
  securityGroup?: SecurityGroup;
  env?: Record<string, string>;
  buildParams: BuildParams;
  serverOrigin: () => {
    origin: LoadBalancerV2Origin | VpcOrigin;
  };
  port: number;
} & AppSource;

export type TaskConstructsProps = {
  vpc: IVpc;
  logGroup: LogGroup;
  taskName: string;
  cluster: Cluster;
  env?: Record<string, string>;
  definition?: FargateTaskDefinitionProps;
} & AppSource;

export interface AppConstruct extends Attach, CDNResource, ApiResource {
  containerName(): string;
}
