import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import type { Construct } from 'constructs';

export function stripBasePathAssociation(
  scope: Construct,
  basePath: string
): cloudfront.FunctionAssociation[] {
  const strippedBasePath = basePath.replace(/^\/+|\/+$/g, '');
  if (!strippedBasePath) return [];

  const id = `${strippedBasePath.replace(/\//g, '-')}StripBasePath`;

  const fn =
    (scope.node.tryFindChild(id) as cloudfront.Function | undefined) ??
    new cloudfront.Function(scope, id, {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(`
const BASE_PATH = ${JSON.stringify(`/${strippedBasePath}`)};
function handler(event) {
  const request = event.request;

  if (request.uri === BASE_PATH) {
    request.uri = "/";
  } else if (request.uri.startsWith(BASE_PATH + "/")) {
    request.uri = request.uri.slice(BASE_PATH.length);
  }

  return request;
}`),
    });

  return [
    { function: fn, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
  ];
}
