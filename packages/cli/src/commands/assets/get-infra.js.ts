import { getCdkJson } from './get-cdk-json';

type GetInfraFileParams = {
  app: string;
  domain?: string;
};

export function getInfra(params: GetInfraFileParams) {
  const infraFile =
`#!/usr/bin/env node
const cdk = require("aws-cdk-lib");
const { FullStackConstruct, AppType } = require("@fy-stack/fullstack-construct");

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

const environment = process.env.ENVIRONMENT
if (!environment) throw new Error("ENVIRONMENT is required");

class AppStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    
    ${params.domain ? `const domainName = ${params.domain}` : ''}

    const app = new FullStackConstruct(this, "App", {
      storage: { retainOnDelete: false },
      apps: {}
    });

    cdk.Tags.of(this).add("App", "${params.app}");
  }
}

const app = new cdk.App();
new AppStack(
  app,
  "app",
  { env, stackName: \`${params.app}-\${process.env.ENVIRONMENT}\` }
);`;

  const cdkJsonFile = JSON.stringify(getCdkJson({
    command: 'node infra.js',
  }), null, 2);

  return { infraFile, cdkJsonFile };
}
