import type { ApiResource } from '@fy-stack/types';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { HttpRouteIntegration } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpUrlIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { beforeEach, describe, expect, it } from 'vitest';

import { ApiGatewayConstruct } from './apigateway-construct';

/**
 * Returns an ApiResource whose `api()` yields one HttpUrlIntegration per
 * given sub-path, ignoring the `path` argument the real construct passes in
 * (the construct only cares about the map `api()` returns).
 */
function apiResource(paths: Record<string, string>): ApiResource {
  let call = 0;

  return {
    api: (): Record<string, HttpRouteIntegration> =>
      Object.fromEntries(
        Object.entries(paths).map(([key, url]) => [
          key,
          new HttpUrlIntegration(`Integration${call++}`, url),
        ])
      ),
  };
}

let stack: Stack;

beforeEach(() => {
  stack = new Stack(new App(), 'TestStack');
});

describe('ApiGatewayConstruct', () => {
  it('throws when a route references a resource that is not provided', () => {
    expect(
      () =>
        new ApiGatewayConstruct(stack, 'Api', {
          routes: { '/*': { $resource: 'app' } },
          resources: {},
        })
    ).toThrow('"app" resource not found');
  });

  it('throws when no base ("/*") route is provided', () => {
    const resources = { app: apiResource({ '': 'https://example.com' }) };

    expect(
      () =>
        new ApiGatewayConstruct(stack, 'Api', {
          routes: { '/other': { $resource: 'app' } },
          resources,
        })
    ).toThrow('no base route');
  });

  it('throws when the base resource has no default integration', () => {
    const resources = { app: apiResource({ '/foo': 'https://example.com' }) };

    expect(
      () =>
        new ApiGatewayConstruct(stack, 'Api', {
          routes: { '/*': { $resource: 'app' } },
          resources,
        })
    ).toThrow('no default integration');
  });

  it('creates an HttpApi with the default integration and open CORS', () => {
    const resources = { app: apiResource({ '': 'https://example.com' }) };

    new ApiGatewayConstruct(stack, 'Api', {
      routes: { '/*': { $resource: 'app' } },
      resources,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties(
      'AWS::ApiGatewayV2::Api',
      Match.objectLike({
        CorsConfiguration: {
          AllowHeaders: ['*'],
          AllowOrigins: ['*'],
          AllowMethods: ['*'],
        },
      })
    );

    template.resourceCountIs('AWS::ApiGatewayV2::Route', 1);
    template.hasResourceProperties(
      'AWS::ApiGatewayV2::Route',
      Match.objectLike({ RouteKey: '$default' })
    );
  });

  it('adds additional routes from the base resource and other resources', () => {
    const resources = {
      app: apiResource({
        '': 'https://example.com',
        '/health': 'https://example.com/health',
      }),
      orders: apiResource({ '/orders': 'https://example.com/orders' }),
    };

    new ApiGatewayConstruct(stack, 'Api', {
      routes: {
        '/*': { $resource: 'app' },
        '/orders': { $resource: 'orders' },
      },
      resources,
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::ApiGatewayV2::Route', 3);
    for (const routeKey of ['$default', 'ANY /health', 'ANY /orders']) {
      template.hasResourceProperties(
        'AWS::ApiGatewayV2::Route',
        Match.objectLike({ RouteKey: routeKey })
      );
    }
  });

  it('exposes the api endpoint through attachable()', () => {
    const resources = { app: apiResource({ '': 'https://example.com' }) };

    const construct = new ApiGatewayConstruct(stack, 'Api', {
      routes: { '/*': { $resource: 'app' } },
      resources,
    });

    const template = Template.fromStack(stack);
    const [apiLogicalId] = Object.keys(
      template.findResources('AWS::ApiGatewayV2::Api')
    );

    const domainMatch = Match.objectEquals({
      'Fn::GetAtt': [apiLogicalId, 'ApiEndpoint'],
    }).test(stack.resolve(construct.attachable().domain));

    expect(domainMatch.failCount).toBe(0);
  });
});
