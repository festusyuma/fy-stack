import { Attachable } from '@fy-stack/types';
import * as cdk from 'aws-cdk-lib';
import type { HttpRouteIntegration } from 'aws-cdk-lib/aws-apigatewayv2';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import {
  AppFile,
  cloudfrontBehaviours,
  filesFromSSM,
  staticDeployment,
} from '../../shared/next-app-router';
import { paramsFromAttachable } from '../../shared/params-from-attachable';
import { publicBucket } from '../../shared/public-bucket';
import { taskDefinitionImage } from '../shared/taskDefinitionImage';
import { AppConstruct, AppProperties } from '../types';

type NextAppRouterProps = AppProperties<unknown>;

export class NextAppRouterConstruct extends Construct implements AppConstruct {
  public container: ecs.ContainerDefinition;
  public queue: sqs.Queue | undefined;

  private readonly static: s3.IBucket;
  private readonly files: AppFile;

  constructor(scope: Construct, id: string, private props: NextAppRouterProps) {
    super(scope, id);

    this.static = publicBucket(this, 'StaticBucket');
    const artifactBucket = new s3.Bucket(this, 'ArtifactStorage', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    if ('output' in props) {
      const deployment = staticDeployment(this, artifactBucket, props.output);
      this.files = { artifactBucket: artifactBucket, ...deployment.files };
    } else {
      const fileParams = filesFromSSM(this, props.reference);
      const appArtifact = s3.Bucket.fromBucketName(
        scope,
        'AppArtifactStorage',
        fileParams.artifact
      );

      this.files = { ...fileParams, artifactBucket: appArtifact };
    }

    this.container = taskDefinitionImage(
      this,
      `${props.appName}AppContainer`,
      props
    );
  }

  cloudfront(path: string): Record<string, cloudfront.BehaviorOptions> {
    const { origin, basePath } = this.props.serverOrigin(
      this.props.port,
      this.container.containerName,
      path,
      '/'
    );

    if (!origin) throw new Error('No server origin');
    this.container.addEnvironment('BASE_PATH', basePath);

    return cloudfrontBehaviours(this, this.static, origin, path, this.files);
  }

  cloudfrontPolicy(distributionId: string) {
    throw new Error(`cloudfrontPolicy not supported for ${this}`);
  }

  api(): Record<string, HttpRouteIntegration> {
    throw new Error('api not supported for this construct');
  }

  attach(attachable: Record<string, Attachable>) {
    const params = Object.assign({}, ...paramsFromAttachable(attachable));
    for (const i in params) {
      this.container.addEnvironment(i, params[i]);
    }
  }

  static parse(params: unknown) {
    return params;
  }
}
