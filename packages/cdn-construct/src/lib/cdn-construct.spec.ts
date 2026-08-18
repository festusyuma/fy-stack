import type { CDNResource } from '@fy-stack/types';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import type { BehaviorOptions } from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { beforeEach, describe, expect, it } from 'vitest';

import { CDNConstruct } from './cdn-construct';

/**
 * Returns a CDNResource whose `cloudfront()` yields one behavior (backed by
 * an HttpOrigin) per given sub-path, ignoring the `path` argument the real
 * construct passes in (the construct only cares about the map returned).
 */
function cdnResource(paths: Record<string, string>): CDNResource {
  return {
    cloudfront: (): Record<string, BehaviorOptions> =>
      Object.fromEntries(
        Object.entries(paths).map(([key, originDomain]) => [
          key,
          { origin: new HttpOrigin(originDomain) },
        ])
      ),
    cloudfrontPolicy: () => ({}),
  };
}

let stack: Stack;

beforeEach(() => {
  stack = new Stack(new App(), 'TestStack', {
    env: { account: '123456789012', region: 'us-east-1' },
  });
});

describe('CDNConstruct', () => {
  it('throws when a route references a resource that is not provided', () => {
    expect(
      () =>
        new CDNConstruct(stack, 'Cdn', {
          routes: { '/*': { $resource: 'app' } },
          resources: {},
        })
    ).toThrow('"app" resource not found');
  });

  it('throws when no base ("/*") route is provided', () => {
    const resources = { app: cdnResource({ '/*': 'example.com' }) };

    expect(
      () =>
        new CDNConstruct(stack, 'Cdn', {
          routes: { '/other': { $resource: 'app' } },
          resources,
        })
    ).toThrow('no base route');
  });

  it('throws when the base resource has no default behaviour', () => {
    const resources = { app: cdnResource({ '/foo': 'example.com' }) };

    expect(
      () =>
        new CDNConstruct(stack, 'Cdn', {
          routes: { '/*': { $resource: 'app' } },
          resources,
        })
    ).toThrow('no default behaviour');
  });

  it('creates a CloudFront distribution with the default and additional behaviors', () => {
    const resources = {
      app: cdnResource({
        '/*': 'app.example.com',
        '/health': 'app.example.com',
      }),
      assets: cdnResource({ '/assets/*': 'assets.example.com' }),
    };

    new CDNConstruct(stack, 'Cdn', {
      routes: {
        '/*': { $resource: 'app' },
        '/assets/*': { $resource: 'assets' },
      },
      resources,
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    for (const pathPattern of ['/health', '/assets/*']) {
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            CacheBehaviors: Match.arrayWith([
              Match.objectLike({ PathPattern: pathPattern }),
            ]),
          }),
        })
      );
    }
  });

  it('exposes the distribution domain through attachable() when no custom domain is set', () => {
    const resources = { app: cdnResource({ '/*': 'app.example.com' }) };

    const construct = new CDNConstruct(stack, 'Cdn', {
      routes: { '/*': { $resource: 'app' } },
      resources,
    });

    const template = Template.fromStack(stack);
    const [distributionLogicalId] = Object.keys(
      template.findResources('AWS::CloudFront::Distribution')
    );

    const domainMatch = Match.objectEquals({
      'Fn::Join': [
        '',
        ['https://', { 'Fn::GetAtt': [distributionLogicalId, 'DomainName'] }],
      ],
    }).test(stack.resolve(construct.attachable().domain));

    expect(domainMatch.failCount).toBe(0);
  });

  it('provisions a certificate and DNS records and uses the custom domain when domains are set', () => {
    const resources = { app: cdnResource({ '/*': 'app.example.com' }) };

    const construct = new CDNConstruct(stack, 'Cdn', {
      routes: { '/*': { $resource: 'app' } },
      resources,
      domains: [{ domain: 'example.com', records: ['www', '*'] }],
    });

    expect(construct.domainName).toBe('www.example.com');
    expect(construct.attachable()).toEqual({ domain: 'https://www.example.com' });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::CertificateManager::Certificate', 1);
    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: 'www.example.com',
      SubjectAlternativeNames: ['example.com'],
    });
    template.resourceCountIs('AWS::Route53::RecordSet', 2);
    template.hasResourceProperties(
      'AWS::Route53::RecordSet',
      Match.objectLike({ Name: 'www.example.com.' })
    );
    template.hasResourceProperties(
      'AWS::Route53::RecordSet',
      Match.objectLike({ Name: 'example.com.' })
    );
  });
});
