import { Attachable, Grantable } from '@fy-stack/types';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTarget from 'aws-cdk-lib/aws-events-targets';
import { IGrantable } from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

import { EventConstructProps } from './types';

/**
 * The EventConstruct class is a custom construct that creates an SNS topic and manages event subscriptions
 * and scheduled jobs for the given resources and event definitions.
 *
 * It extends the Construct class and implements the {@link Attachable `Attachable`} and {@link Grantable `Grantable`} interfaces.
 */
export class EventConstruct extends Construct implements Attachable, Grantable {
  public readonly topic: sns.Topic;

  constructor(scope: Construct, id: string, props: EventConstructProps) {
    super(scope, id);

    this.topic = new sns.Topic(this, 'AppTopic');

    for (const i in props?.messages ?? []) {
      const appMessage = props?.messages?.[i];
      if (!appMessage) continue;

      const app = props.resources?.[appMessage.$resource];
      if (!app) throw new Error(`${appMessage.$resource} not found`);

      const filterPolicy: snsSubscriptions.SubscriptionProps = {
        filterPolicyWithMessageBody: {
          message: sns.FilterOrPolicy.filter(
            sns.SubscriptionFilter.stringFilter({
              allowlist: appMessage.messages,
            })
          ),
        },
      };

      this.topic.addSubscription(app.subscription(filterPolicy))
    }

    for (const i in props?.schedule ?? []) {
      const job = props.schedule?.[i];
      if (!job) continue;

      for (const message of job.messages) {
        const targets = [
          new eventsTarget.SnsTopic(this.topic, {
            message: events.RuleTargetInput.fromObject({
              message,
            }),
          }),
        ];

        if (job.cron) {
          new events.Rule(this, `ScheduleRuleCron${i}${message}`, {
            schedule: events.Schedule.cron(job.cron),
            targets,
          });
        }

        if (job.expression) {
          new events.Rule(this, `ScheduleRuleExpression${i}${message}`, {
            schedule: events.Schedule.expression(job.expression),
            targets,
          });
        }

        if (job.rate) {
          new events.Rule(this, `ScheduleRuleRate${i}${message}`, {
            schedule: events.Schedule.rate(job.rate),
            targets,
          });
        }
      }
    }
  }

  attachable() {
    return {
      topic: this.topic.topicArn,
    };
  }

  grantable(grant: IGrantable) {
    this.topic.grantPublish(grant);
  }
}
