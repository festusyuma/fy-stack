import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

export function proxyPathHeaderCode(proxyPath: string) {
  return cloudfront.FunctionCode.fromInline(`
const PROXY_PATH = ${JSON.stringify(proxyPath)};
function handler(event) {
  const request = event.request;
  request.headers["proxy-path"] = { value: PROXY_PATH };
  return request;
}`);
}
