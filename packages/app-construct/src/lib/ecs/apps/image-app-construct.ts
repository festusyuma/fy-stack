import { Attachable } from '@fy-stack/types';
import type { HttpRouteIntegration } from 'aws-cdk-lib/aws-apigatewayv2';
import {
  AllowedMethods,
  BehaviorOptions,
  CachePolicy,
  OriginRequestPolicy,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

import { paramsFromAttachable } from '../../util/params-from-attachable';
import { taskDefinitionImage } from '../shared/taskDefinitionImage';
import { AppConstruct, AppProperties } from '../types';

export class ImageAppConstruct extends Construct implements AppConstruct {
  public container: ecs.ContainerDefinition;

  constructor(
    scope: Construct,
    id: string,
    private props: AppProperties<unknown>
  ) {
    super(scope, id);

    this.container = taskDefinitionImage(`${props.appName}AppContainer`, {
      taskDefinition: props.taskDefinition,
      port: props.port,
      env: props.env,
      output: props.output,
      container: props.container,
      environmentPath: props.environmentPath,
    });
  }

  attach(attachable: Record<string, Attachable>): void {
    const params = Object.assign({}, ...paramsFromAttachable(attachable));
    for (const i in params) {
      this.container.addEnvironment(i, params[i]);
    }
  }

  cloudfront(path: string): Record<string, BehaviorOptions> {
    const { origin, basePath } = this.props.serverOrigin(
      this.props.port,
      this.container.containerName,
      path,
      '/health'
    );

    if (!origin) throw new Error('No server origin');
    this.container.addEnvironment('BASE_PATH', basePath);

    const appBehaviour = {
      origin,
      cachePolicy: CachePolicy.CACHING_DISABLED,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      compress: true,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      responseHeadersPolicy:
        ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS,
    };

    return { [`${path}/*`]: appBehaviour };
  }

  cloudfrontPolicy(distributionId: string) {
    throw new Error(`cloudfront policy is not supported for ${this}`);
  }

  api(path: string): Record<string, HttpRouteIntegration> {
    throw new Error(`api is not supported for ${this}`);
  }

  static parse(params: unknown) {
    return params;
  }
}
