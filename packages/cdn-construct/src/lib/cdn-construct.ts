import type { Attachable, CDNResource } from '@fy-stack/types';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

import { CDNConstructProps } from './types';

/**
 * CDNConstruct is a custom construct that sets up a CloudFront distribution
 * based on provided routing and resource configurations.
 */
export class CDNConstruct extends Construct implements Attachable {
  public distribution: cloudfront.Distribution;
  public domainName: string | undefined;

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

    const { '/*': defaultBehavior, ...additionalDefaultBehaviors } =
      base.cloudfront('');

    if (!defaultBehavior) throw new Error('no default behaviour');

    const additionalBehaviors: Record<string, cloudfront.BehaviorOptions> = {}

    for (const i in otherRoutes) {
      Object.assign(additionalBehaviors, otherRoutes[i]?.cloudfront(i));
    }

    Object.assign(additionalBehaviors, additionalDefaultBehaviors)

    let certificate: acm.Certificate | undefined;

    const subjectAlternativeNames: string[] = [];
    const zones: Record<string, route53.IHostedZone> = {};

    if (props.domains) {
      const [defaultDomain, ...otherRecords] = props.domains;
      if (defaultDomain) {
        const {
          records: [defaultDomainRecord, ...otherDefaultDomainRecords],
        } = defaultDomain;

        this.domainName = this.parseDomain(
          defaultDomainRecord,
          defaultDomain.domain
        );

        zones[defaultDomain.domain] = route53.HostedZone.fromLookup(
          this,
          'Zone0',
          { domainName: defaultDomain.domain }
        );

        zones[this.domainName] = zones[defaultDomain.domain];

        for (const i in otherDefaultDomainRecords) {
          const recordDomain = this.parseDomain(
            otherDefaultDomainRecords[i],
            defaultDomain.domain
          );

          zones[recordDomain] = zones[defaultDomain.domain];
          subjectAlternativeNames.push(recordDomain);
        }

        for (const i in otherRecords) {
          zones[otherRecords[i].domain] = route53.HostedZone.fromLookup(
            this,
            `Zone${i + 1}`,
            { domainName: otherRecords[i].domain }
          );

          for (const j in otherRecords[i].records) {
            const recordDomain = this.parseDomain(
              otherRecords[i].records[j],
              otherRecords[i].domain
            );

            zones[recordDomain] = zones[otherRecords[i].domain];
            subjectAlternativeNames.push(recordDomain);
          }
        }

        certificate = new acm.Certificate(this, 'DomainCertificate', {
          domainName: this.domainName,
          subjectAlternativeNames,
          validation: acm.CertificateValidation.fromDnsMultiZone(zones),
        });
      }
    }

    this.distribution = new cloudfront.Distribution(this, 'CDN', {
      defaultBehavior,
      additionalBehaviors,
      certificate,
      domainNames: this.domainName
        ? [this.domainName, ...subjectAlternativeNames]
        : undefined,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enableLogging: true
    });

    if (props.domains) {
      const distributionTarget = new route53Targets.CloudFrontTarget(
        this.distribution
      );

      for (const i in props.domains) {
        for (const j in props.domains[i].records) {
          new route53.ARecord(this, `Record${i}${j}`, {
            target: { aliasTarget: distributionTarget },
            zone: zones[props.domains[i].domain],
            recordName:
              props.domains[i].records[j] === '*'
                ? undefined
                : props.domains[i].records[j],
          });
        }
      }
    }
  }

  private parseDomain(record: string, domain: string) {
    if (record === '*') return domain;
    else return `${record}.${domain}`;
  }

  attachable(): Record<string, string> {
    return {
      domain: 'https://' + (this.domainName ?? this.distribution.domainName),
    };
  }
}
