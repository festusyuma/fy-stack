# @fy-stack/cli

Command-line interface for initializing `@fy-stack` infrastructure in a project, configuring AWS IAM OpenID Connect (OIDC) roles and GitHub Actions workflows for automated deployment, and provisioning required CloudFront cache policies.

## Installation & Usage

```bash
npx @fy-stack/cli init -a <app-name>
# or install globally
npm install -g @fy-stack/cli
fy-stack init --app <app-name>
```

## Commands

### `fy-stack init`

Initializes application infrastructure in the current working directory.

#### Options

| Flag | Description | Required |
|---|---|---|
| `-a, --app <string>` | Application name | Yes |

#### Interactive Prompts

1. **Setup github deployment** (`confirm`, default: `true`)
   - If confirmed, prompts for **repository full name** (e.g. `Org/repository`).
2. **Enter domain name** (`input`, optional)
   - Root domain name to configure in `infra.js` (e.g. `example.com` for `production` and `<environment>.example.com` for other environments).

#### What `init` Does

1. **GitHub Actions & AWS OIDC Setup (when GitHub deployment is enabled):**
   - Checks for an existing IAM OpenID Connect provider for `token.actions.githubusercontent.com` in the AWS account, or creates one if absent.
   - Creates (or reuses) an IAM role named `<app>GithubRole` trusted by `repo:<Org/repository>:*`.
   - Copies permissions from the currently authenticated AWS caller to `<app>GithubRole` (attaching `AdministratorAccess` if called by `:root`, or cloning the IAM user's and their groups' managed and inline policies).
   - Generates `.github/workflows/fy-stack.deploy.yml` configured to assume `<app>GithubRole`, run `npx cdk deploy --require-approval never --outputs-file app.json`, and load the exported `appSecrets` from AWS Secrets Manager. The workflow uses Node.js 24 (`aws-cdk-lib` requires Node.js 20+).
2. **CloudFront Image Cache Policy:**
   - Creates or updates a CloudFront cache policy named `AppImagePolicy` (TTL up to 1 year, Brotli & Gzip enabled, forwarding all query strings) and stores its ID in AWS SSM Parameter Store at `/fy-stack/ImagePolicyID`.
3. **Project Scaffolding:**
   - Adds the required `devDependencies` to `package.json`, keeping any versions already present:
     - `aws-cdk` (`^2.1148.1`), `aws-cdk-lib` (`2.265.0`, pinned to match the constructs' peer dependency), `constructs` (`^10.5.1`), `cdk-ecr-deployment` (`^4.1.2`), `@aws-sdk/client-sts`.
     - `@fy-stack/fullstack-construct` and `@fy-stack/types` at the same version as the CLI.
   - Generates `cdk.json` and a starter `infra.js` stack using `FullStackConstruct` with `outputs: true` (needed by the workflow's `appSecrets` step). When a domain is given, it is set as `domain` with records `["*", "www"]` in `production` and `[environment]` otherwise.
   - Existing `cdk.json`, `infra.js` and `.github/workflows/fy-stack.deploy.yml` files are never overwritten.
