import { ApiResource, type Attachable } from '@fy-stack/types';
import { CorsHttpMethod, HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { Construct } from "constructs";

import { ApiGatewayConstructProps } from "./types";

/**
 * ApiGatewayConstruct is a construct class for creating an API Gateway with defined routes and integrations.
 *
 * The constructor initializes the API Gateway with default and additional integrations based on the provided props.
 * It sets up CORS preflight options to allow headers, origins, and methods from any source.
 *
 * @throws {Error} Throws an error if the base route is not found.
 */
export class ApiGatewayConstruct extends Construct implements Attachable {
  public readonly api: HttpApi;

  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
    super(scope, id);

    const routes: Record<string, ApiResource> = {};

    Object.assign(
      routes,
      Object.fromEntries(
        Object.entries(props.routes).map(([key, val]) => {
          const app = props.resources?.[val.$resource];
          if (!app) throw new Error(`"${val.$resource}" resource not found`);

          return [key, app];
        })
      )
    );

    const { '/*': base, ...otherRoutes } = routes;
    if (!base) throw new Error('no base route');

    const { '': defaultIntegration, ...additionalIntegrations } = base.api('');

    if (!defaultIntegration) throw new Error('no default integration');

    for (const i in otherRoutes) {
      Object.assign(additionalIntegrations, otherRoutes[i]?.api(i));
    }

    this.api = new HttpApi(this, 'Api', {
      corsPreflight: {
        allowHeaders: ['*'],
        allowOrigins: ['*'],
        allowMethods: [CorsHttpMethod.ANY],
      },
    });

    for (const i in additionalIntegrations) {
      this.api.addRoutes({
        integration: additionalIntegrations[i],
        methods: [HttpMethod.ANY],
        path: i,
      });
    }
  }

  attachable(): Record<string, string> {
    return {
      domain: this.api.apiEndpoint
    }
  }
}
