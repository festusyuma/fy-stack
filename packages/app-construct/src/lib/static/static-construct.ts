import { AppType } from '@fy-stack/types';
import { Construct } from 'constructs';

import { NextPagesExportConstruct } from './apps/next-pages-export-construct';
import { StaticWebsiteConstruct } from './apps/static-website-construct';
import { AppConstruct, StaticConstructProps } from './types';

const AppBuilds = {
  [AppType.NEXT_PAGE_EXPORT]: NextPagesExportConstruct,
  [AppType.STATIC_WEBSITE]: StaticWebsiteConstruct,
};

export class StaticConstruct extends Construct {
  apps: Record<string, AppConstruct> = {};

  constructor(scope: Construct, id: string, props: StaticConstructProps) {
    super(scope, id);

    Object.assign(
      this.apps,
      Object.fromEntries(
        Object.entries(props.apps).map(([key, app]) => {
          const AppTypeConstruct = AppBuilds[app.type];

          return [
            key,
            new AppTypeConstruct(this, `${key}App`, {
              buildParams: AppTypeConstruct.parse(app.buildParams ?? {}),
              ...app,
            }),
          ];
        })
      )
    );
  }
}
