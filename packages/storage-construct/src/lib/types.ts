import { NestedStackProps } from 'aws-cdk-lib';

export interface StorageConstructProps {
  /** Retain bucket when stack is deleted */
  retainOnDelete?: boolean
}

export interface StorageCdkStackProps extends NestedStackProps{
  bucketArn: string
}
