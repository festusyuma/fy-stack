import { getCdkJson } from './get-cdk-json';

type GetInfraFileParams = {
  app: string;
  domain?: string;
};

export function getInfra(params: GetInfraFileParams) {
  const infraFile = `#!/usr/bin/env node
const cdk = require("aws-cdk-lib");
const { FullStackConstruct, AppType } = require("@fy-stack/fullstack-construct");
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

const environment = process.env.ENVIRONMENT
if (!environment) throw new Error("ENVIRONMENT is required");

const appName = ${params.app}

class AppStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    
    ${
      params.domain
        ? `const domainName = environment === 'production' ? ${params.domain} : \`\${environment}.${params.domain}\``
        : ''
    }

    const app = new FullStackConstruct(this, "App", {
      environment,
      name: \${appName},
      ownerArn: props.ownerArn,
      storage: { retainOnDelete: false },
      apps: {}
    });
  }
}

(async () => {
  const sts = new STSClient();
  const res = await sts.send(new GetCallerIdentityCommand());
  if (!res.Arn) throw new Error('caller not found');

  const app = new cdk.App();
  const stackName = \`\${appName}-\${environment}\`;

  new AppStack(app, stackName, {
    env,
    stackName,
    ownerArn: res.Arn,
  });
})();`;

  const cdkJsonFile = JSON.stringify(
    getCdkJson({
      command: 'node infra.js',
    }),
    null,
    2
  );

  return { infraFile, cdkJsonFile };
}
