import path from 'node:path';

import { HttpUrlIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import type { Function, FunctionUrl } from 'aws-cdk-lib/aws-lambda';

export function lambdaApi(
  func: Function,
  apiUrl: FunctionUrl,
  basePath: string
) {
  const strippedPath = basePath.replace(/^\/+|\/+$/g, '');

  func.addEnvironment('BASE_PATH', basePath);

  const wildcardIntegration = new HttpUrlIntegration(
    'AppIntegration',
    apiUrl.url + path.join(strippedPath, '{proxy}')
  );

  const integration = new HttpUrlIntegration(
    'AppWildcardIntegration',
    apiUrl.url + strippedPath
  );

  return {
    [basePath]: integration,
    [`${basePath}/{proxy+}`]: wildcardIntegration,
  };
}
