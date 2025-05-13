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
        run: npx cdk deploy --require-approval never --outputs-file app.json
        
      - name: Get App Secrets Name
        id: get_app_secrets
        run: |
          SECRETS=$(jq -r '."${props.app}-\${{ env.ENVIRONMENT }}".appSecrets' app.json)
          echo "app_secrets=$SECRETS" >> $GITHUB_OUTPUT

      # Load App secrets back into actions to perform tasks like seed
      # Remove if not needed
      - name: Fetch App Secrets
        uses: aws-actions/aws-secretsmanager-get-secrets@v2
        with:
          secret-ids: |
            ,\${{ steps.get_app_secrets.outputs.app_secrets }}
          name-transformation: none
          parse-json-secrets: true`;
}
