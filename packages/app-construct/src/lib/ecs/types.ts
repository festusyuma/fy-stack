import type { ApiResource, Attach, CDNResource } from '@fy-stack/types';
import { AppType } from '@fy-stack/types';
import type { LoadBalancerV2Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import type { IVpc } from 'aws-cdk-lib/aws-ec2';
import type {
  AssetImageProps,
  Cluster,
  ContainerDefinitionOptions,
  FargateServiceProps,
  FargateTaskDefinitionProps,
  TaskDefinition,
} from 'aws-cdk-lib/aws-ecs';
import type { ApplicationLoadBalancerProps } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import type { LogGroup } from 'aws-cdk-lib/aws-logs';

export type EcsConstructProps = {
  logGroup: LogGroup;
  environmentPath: string;
  environment: string;
  vpc: IVpc;
  server?: Omit<
    FargateServiceProps,
    'cluster' | 'taskDefinition' | 'assignPublicIp' | 'vpcSubnets'
  > & {
    assignPublicIp?: boolean;
    definition?: FargateTaskDefinitionProps;
    apps: Record<string, ServerApp>;
    /**
     *  Load balancer config details,
     * a load balancer is required when CDN is attached and will be created if no arn is present in config.
     * */
    loadBalancer?:
      | {
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
        }
      | ApplicationLoadBalancerProps;
  };
  tasks?: Record<string, TaskApp>;
};

export type AppSource =
  | {
      output: string;
      container?: Omit<ContainerDefinitionOptions, 'image' | 'logging'> & {
        image: AssetImageProps;
      };
    }
  | {
      reference: string;
      version?: string;
      container?: Omit<ContainerDefinitionOptions, 'image' | 'logging'>;
    };

export type ServerApp = {
  type: typeof AppType.NEXT_APP_ROUTER | typeof AppType.IMAGE_APP;
  env?: Record<string, string>;
  /** Additional parameters that may be required, this varies based on type */
  buildParams?: Record<string, unknown>;
  port: number;
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
  env?: Record<string, string>;
  buildParams: BuildParams;
  serverOrigin: (
    port: number,
    containerName: string,
    appPath: string,
    healthPath?: string
  ) => { basePath: string; origin: LoadBalancerV2Origin };
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

export interface AppConstruct extends Attach, CDNResource, ApiResource {}
