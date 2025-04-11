import type { InstanceClass, InstanceSize } from 'aws-cdk-lib/aws-ec2';
import type {
  DatabaseInstanceProps,
  IInstanceEngine,
} from 'aws-cdk-lib/aws-rds';

/**
 * Properties required for setting up a database construct.
 */
export type DatabaseConstructProps = Omit<
  DatabaseInstanceProps,
  'instanceType' | 'databaseName' | 'publiclyAccessible' | 'engine' | 'vpc'
> & {
  useDefault?: boolean;

  /** Optionally pass in existing VPC id */
  vpcId?: string;

  /**
   *  Define specific RDS instance {@link IInstanceEngine engine}
   */
  engine?: IInstanceEngine;

  /** Define specific RDS instance {@link InstanceClass class} and {@link InstanceSize size} to use. */
  instance?: { class: InstanceClass; size: InstanceSize };

  /** Make database public */
  public?: boolean;
};
