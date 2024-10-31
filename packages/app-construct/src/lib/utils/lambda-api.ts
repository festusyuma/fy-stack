import { Function } from 'aws-cdk-lib/aws-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {  HttpUrlIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

export function lambdaApi(func: Function, path: string) {
  const apiUrl = func.addFunctionUrl({
    authType: lambda.FunctionUrlAuthType.NONE,
  });

  func.addEnvironment('BASE_PATH', path);

  const integration = new HttpUrlIntegration(
    'AppIntegration',
    apiUrl.url
  );

  return { [`${path}/*`]: integration };
}