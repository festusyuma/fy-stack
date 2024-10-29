import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

import { CDNConstructProps, CDNResource } from './types';

export class CDNConstruct extends Construct {
  public distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: CDNConstructProps) {
    super(scope, id);

    const routes: Record<string, CDNResource> = {};

    Object.assign(
      routes,
      Object.fromEntries(
        Object.entries(props.routes).map(([key, val]) => {
          if ('$app' in val) {
            const app = props.apps[val.$app];
            if (!app) throw new Error(`"${val.$app}" app not found`);

            app.function.addEnvironment('BASE_PATH', key);
            return [key, app];
          } else {
            const resource = props.resources[val.$resource];
            if (!resource) throw new Error(`${val.$resource} resource not found`);

            return [key, resource];
          }
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

    /*if (props.storage && uploadEnabled) {
      props.storage.bucket.addToResourcePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:GetObject'],
          principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
          resources: ['arn:aws:s3:::' + props.storage.bucket.bucketName + '/!*'],
          conditions: {
            StringEquals: {
              'AWS:SourceArn':
                'arn:aws:cloudfront::' +
                account +
                ':distribution/' +
                this.distribution.distributionId,
            },
          },
        })
      );
    }*/
  }
}
