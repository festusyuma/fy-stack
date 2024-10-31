import { ApiResource } from '@fy-stack/types';
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { Construct } from "constructs";

import { ApiGatewayConstructProps } from "./types";

export class ApiGatewayConstruct extends Construct {
  public readonly api: HttpApi;

  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
    super(scope, id);

    const routes: Record<string, ApiResource> = {};

    Object.assign(
      routes,
      Object.fromEntries(
        Object.entries(props.routes).map(([key, val]) => {
          const app = props.apps?.[val.$resource];
          if (!app) throw new Error(`"${val.$resource}" resource not found`);

          return [key, app];
        }),
      ),
    );

    const { "/*": base, ...otherRoutes } = routes;
    if (!base) throw new Error("no base route");

    const { "/*": defaultIntegration, ...additionalIntegrations } = base
      .api("");

    if (!defaultIntegration) throw new Error("no default integration");

    for (const i in otherRoutes) {
      Object.assign(additionalIntegrations, otherRoutes[i]?.api(i));
    }

    this.api = new HttpApi(this, "Api", { defaultIntegration });

    for (const i in additionalIntegrations) {
      this.api.addRoutes({
        integration: additionalIntegrations[i],
        methods: [HttpMethod.ANY],
        path: `${i}/{proxy+}`,
      });
    }
  }
}
