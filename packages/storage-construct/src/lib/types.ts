import { NestedStackProps } from 'aws-cdk-lib';

/**
 * Interface representing the properties required for constructing a StorageConstruct.
 */
export interface StorageConstructProps {
  /** Retain bucket when stack is deleted */
  retainOnDelete?: boolean
  logTable?: boolean
  keys?: string[]
}

/**
 * Interface representing the properties required for configuring a storage stack in CDK.
 * Extends from {@link NestedStackProps `NestedStackProps`}.
 */
export interface StorageCdkStackProps extends NestedStackProps{
  /** S3 Bucket Arn */
  bucketArn: string
}
