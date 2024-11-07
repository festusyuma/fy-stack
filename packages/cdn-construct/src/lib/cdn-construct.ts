import type { CDNResource } from '@fy-stack/types';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

import { CDNConstructProps } from './types';

/**
 * CDNConstruct is a custom construct that sets up a CloudFront distribution
 * based on provided routing and resource configurations.
 */
export class CDNConstruct extends Construct {
  public distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: CDNConstructProps) {
    super(scope, id);

    const routes: Record<string, CDNResource> = {};

    Object.assign(
      routes,
      Object.fromEntries(
        Object.entries(props.routes).map(([key, val]) => {
          const app = props.resources?.[val.$resource];
          if (!app) throw new Error(`"${val.$resource}" app not found`);
          return [key, app];
        })
      )
    );

    const { '/*': base, ...otherRoutes } = routes;
    if (!base) throw new Error('no base route');

    const { '/*': defaultBehavior, ...additionalBehaviors } =
      base.cloudfront('');

    if (!defaultBehavior) throw new Error('no default behaviour');

    for (const i in otherRoutes) {
      Object.assign(additionalBehaviors, otherRoutes[i]?.cloudfront(i));
    }

    this.distribution = new cloudfront.Distribution(this, 'CDN', {
      defaultBehavior,
      additionalBehaviors,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });
  }
}
