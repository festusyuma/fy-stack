import { Attachable } from '@fy-stack/types';
import { AuthorizationType, CfnApi, CfnApiKey } from 'aws-cdk-lib/aws-appsync';
import { Construct } from 'constructs';

import { AuthProviderCapability, WebsocketConstructProps } from './types';

/**
 * The Websocket class is a custom construct that creates an Appsync Event Api along with the various event configuration
 *
 * It extends the Construct class and implements the {@link Attachable `Attachable`} interface.
 */
export class WebsocketConstruct extends Construct implements Attachable {
  socket: CfnApi;
  apiKey: CfnApiKey | undefined;

  constructor(scope: Construct, id: string, props: WebsocketConstructProps) {
    super(scope, id);

    const { authProviders, name, ...otherProps } = props;

    let withApiKey: { expires: number } | undefined;

    const formattedAuthProviders: CfnApi.AuthProviderProperty[] = [];
    const connectionAuthModes: AuthorizationType[] = [];
    const defaultPublishAuthModes: AuthorizationType[] = [];
    const defaultSubscribeAuthModes: AuthorizationType[] = [];

    for (const provider of authProviders) {
      if (provider.type === AuthorizationType.API_KEY) {
        withApiKey = {
          expires:
            Math.round(new Date().setDate(new Date().getDate() + provider.expires) / 1000),
        };

        formattedAuthProviders.push({
          authType: provider.type,
        });
      } else if (provider.type === AuthorizationType.USER_POOL) {
        formattedAuthProviders.push({
          authType: provider.type,
          cognitoConfig: {
            userPoolId: provider.userPool.userPoolId,
            awsRegion: provider.userPool.stack.region,
          },
        });
      } else if (provider.type === AuthorizationType.LAMBDA) {
        formattedAuthProviders.push({
          authType: provider.type,
          lambdaAuthorizerConfig: {
            authorizerUri: provider.handler.functionArn,
            authorizerResultTtlInSeconds:
              provider.resultsCacheTtl?.toSeconds() ?? 0,
            identityValidationExpression: provider.validationRegex,
          },
        });
      } else continue;

      for (const capability of provider.capabilities) {
        if (capability === AuthProviderCapability.CONNECT)
          connectionAuthModes.push(provider.type);

        if (capability === AuthProviderCapability.PUBLISH)
          defaultPublishAuthModes.push(provider.type);

        if (capability === AuthProviderCapability.SUBSCRIBE)
          defaultSubscribeAuthModes.push(provider.type);
      }
    }

    this.socket = new CfnApi(this, 'Socket', {
      name: name ?? `${id}-socket`,
      eventConfig: {
        authProviders: formattedAuthProviders,
        connectionAuthModes: connectionAuthModes.map((mode) => ({
          authType: mode,
        })),
        defaultPublishAuthModes: defaultPublishAuthModes.map((mode) => ({
          authType: mode,
        })),
        defaultSubscribeAuthModes: defaultSubscribeAuthModes.map((mode) => ({
          authType: mode,
        })),
      },
      ...otherProps,
    });

    if (withApiKey) {
      this.apiKey = new CfnApiKey(this, 'ApiKey', {
        apiId: this.socket.attrApiId,
        expires: withApiKey.expires,
      });
    }
  }

  attachable(): Record<string, string> {
    const params = {
      ARN: this.socket.attrApiArn,
      HTTP_DNS: this.socket.getAtt('Dns.Http').toString(),
      REALTIME_DNS: this.socket.getAtt('Dns.Realtime').toString(),
    };

    if (this.apiKey) {
      Object.assign(params, { API_KEY: this.apiKey?.attrApiKey });
    }

    return params;
  }
}
