import { AppType } from '@fy-stack/types';
import { Construct } from 'constructs';

import { ImageAppConstruct } from './apps/image-app-construct';
import { NextAppRouterConstruct } from './apps/next-app-router-construct';
import { NodeApiConstruct } from './apps/node-api-construct';
import { NodeAppConstruct } from './apps/node-app-construct';
import { AppConstruct, LambdaConstructProps } from './types';

const AppBuilds = {
  [AppType.NEXT_APP_ROUTER]: NextAppRouterConstruct,
  [AppType.NODE_APP]: NodeAppConstruct,
  [AppType.NODE_API]: NodeApiConstruct,
  [AppType.IMAGE_APP]: ImageAppConstruct,
};

export class LambdaConstruct extends Construct {
  apps: Record<string, AppConstruct> = {};

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    Object.assign(
      this.apps,
      Object.fromEntries(
        Object.entries(props.apps).map(([key, app]) => {
          const AppTypeConstruct = AppBuilds[app.type];

          return [
            key,
            new AppTypeConstruct(this, `${key}App`, {
              // @ts-expect-error invalid params
              buildParams: AppTypeConstruct.parse(app.buildParams ?? {}),
              vpc: props.vpc,
              ...app,
            }),
          ];
        })
      )
    );
  }
}
