type GetYamlFileProps = {
  app: string;
  roleArn: string;
  region: string;
};

export function getYAMLFile(props: GetYamlFileProps) {
  return`# Run on push to branch
name: Build and Deploy

on:
  push:
    branches:
      - main
      # add additional branch names if needed

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    env:
      ENVIRONMENT: \${{ (github.ref_name == 'main' && 'production') || github.ref_name }}

    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      # setup aws credentials using aws role and region
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-skip-session-tagging: true
          role-to-assume: ${props.roleArn}
          aws-region: ${props.region}

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Deploy Apps
        run: npx cdk deploy --require-approval never`;
}
