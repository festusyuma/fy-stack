import path from 'node:path';

import { HttpUrlIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Function } from 'aws-cdk-lib/aws-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export function lambdaApi(func: Function, basePath: string) {
  const strippedPath = basePath.replace(/^\/+|\/+$/g, '');

  const apiUrl = func.addFunctionUrl({
    authType: lambda.FunctionUrlAuthType.NONE,
  });

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
