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
import type { RetentionDays } from 'aws-cdk-lib/aws-logs';

export type EcsConstructProps = {
  environmentPath: string;
  vpc: IVpc;
  server?: Omit<
    FargateServiceProps,
    'cluster' | 'taskDefinition' | 'assignPublicIp' | 'vpcSubnets'
  > & {
    assignPublicIp?: boolean;
    definition?: FargateTaskDefinitionProps;
    apps: Record<string, ServerApp>;
    useExistingLoadBalancer?: {
      loadBalancerArn: string;
    };
  };
  tasks?: Record<string, TaskApp>;
};

export type ServerApp = {
  type: typeof AppType.NEXT_APP_ROUTER | typeof AppType.IMAGE_APP;
  output: string;
  env?: Record<string, string>;
  buildParams?: Record<string, unknown>;
  port: number;
};

export type TaskApp = {
  type: typeof AppType.IMAGE_APP;
  output: string;
  env?: Record<string, string>;
  buildParams?: Record<string, unknown>;
};

export type AppProperties<BuildParams = Record<string, unknown>> = {
  appName: string;
  environmentPath: string;
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
  output: string;
  container?: Omit<ContainerDefinitionOptions, 'image' | 'logging'> & {
    image: AssetImageProps;
    logDuration?: RetentionDays;
  };
};

export type TaskConstructsProps = FargateTaskDefinitionProps & {
  vpc: IVpc;
  cluster: Cluster;
  env?: Record<string, string>;
  output: string;
  container?: Omit<ContainerDefinitionOptions, 'image' | 'logging'> & {
    image: AssetImageProps;
    logDuration?: RetentionDays;
  };
};

export interface AppConstruct extends Attach, CDNResource, ApiResource {}
