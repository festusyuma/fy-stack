import * as iam from 'aws-cdk-lib/aws-iam'

export interface Attachable {
  attachable(): Record<string, string>
}

export interface Attach {
  attach(attachable: Record<string, Attachable>): void
}

export interface Grantable {
  grantable(grant: iam.IGrantable): void
}

export interface Grant {
  grant(...grantables: Grantable[]): void
}