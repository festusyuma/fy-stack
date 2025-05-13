import type { IVpc } from 'aws-cdk-lib/aws-ec2';
import type {
  AssetImageProps,
  ContainerDefinitionOptions,
  Ec2TaskDefinitionProps,
  FargateTaskDefinitionProps,
} from 'aws-cdk-lib/aws-ecs';

export type TaskConstructsProps = FargateTaskDefinitionProps & {
  vpc: IVpc;
  clusterArn: string;
  env?: Record<string, string>;
  output: string;
  defaultImage?: Omit<ContainerDefinitionOptions, 'image' | 'logging'> & {
    container: AssetImageProps;
  };
};

export type ServiceConstructsProps = Ec2TaskDefinitionProps & {
  vpc: IVpc;
  env?: Record<string, string>;
  output: string;
  defaultImage?: Omit<ContainerDefinitionOptions, 'image' | 'logging'> & {
    container: AssetImageProps;
  };
};
