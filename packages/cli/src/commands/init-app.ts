import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  type AttachedPolicy,
  AttachRolePolicyCommand,
  CreateOpenIDConnectProviderCommand,
  CreateRoleCommand,
  GetOpenIDConnectProviderCommand,
  GetUserPolicyCommand,
  IAMClient,
  ListAttachedGroupPoliciesCommand,
  ListAttachedUserPoliciesCommand,
  ListGroupPoliciesCommand,
  ListGroupsForUserCommand,
  ListOpenIDConnectProvidersCommand,
  ListUserPoliciesCommand,
  PutRolePolicyCommand
} from '@aws-sdk/client-iam';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

import { getInfra } from './assets/get-infra.js';
import { getYAMLFile } from './assets/get-yaml-file';
import { InitAppProps } from './types';

const iamClient = new IAMClient()

async function attachManagedPolicies(roleName: string, attachedPolices?: AttachedPolicy[]) {
  for (const policy of attachedPolices ?? []) {
    await iamClient.send(new AttachRolePolicyCommand({
      PolicyArn: policy.PolicyArn,
      RoleName: roleName
    }))
  }
}

export async function initApp(props: InitAppProps) {
  const stsClient = new STSClient()
  const user = await stsClient.send(new GetCallerIdentityCommand())

  const username = user.Arn?.split("/").pop();
  if (!username) throw new Error("username not found")
  const isRoot = username.endsWith(":root");

  const workingDir = process.cwd()

  if (props.githubRepo) {
    const githubFolderPath = path.join(workingDir, '.github/workflows/')
    if (!fs.existsSync(githubFolderPath)) fs.mkdirSync(githubFolderPath, { recursive: true })

    const deployYamlPath = path.join(githubFolderPath, "fy-stack.deploy.yml")
    if (fs.existsSync(deployYamlPath)) throw new Error("fy-stack.deploy.yml already exists")

    const existingRes = await iamClient.send(new ListOpenIDConnectProvidersCommand())

    let idProviderArn: string | undefined;
    const providerUrl = 'token.actions.githubusercontent.com'

    for (const i in existingRes.OpenIDConnectProviderList ?? []) {
      const provider = await iamClient.send(new GetOpenIDConnectProviderCommand({
        OpenIDConnectProviderArn: existingRes.OpenIDConnectProviderList?.[i].Arn
      }))

      if (provider.Url === providerUrl) {
        idProviderArn = existingRes.OpenIDConnectProviderList?.[i].Arn
        break;
      }
    }

    if (!idProviderArn) {
      const idProviderRes = await iamClient.send(new CreateOpenIDConnectProviderCommand({
        Url: providerUrl,
        ClientIDList: ['sts.amazonaws.com']
      }))

      if (!idProviderRes.OpenIDConnectProviderArn) throw new Error('unable to Github open id provider')
      idProviderArn = idProviderRes.OpenIDConnectProviderArn
    }

    const roleRes = await iamClient.send(new CreateRoleCommand({
      RoleName: `${props.app}GithubRole`,
      AssumeRolePolicyDocument: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
          Effect: "Allow",
          Principal: { Federated: idProviderArn },
          Action: "sts:AssumeRoleWithWebIdentity",
          Condition: {
            StringEquals: { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
            StringLike: { "token.actions.githubusercontent.com:sub": `repo:${props.githubRepo}:*` }
          }
        }]
      }),
    }))

    if (!roleRes.Role?.Arn || !roleRes.Role.RoleName) throw new Error('unable to Github role')
    const roleName = roleRes.Role.RoleName

    if (isRoot) {
      await iamClient.send(new AttachRolePolicyCommand({
        PolicyArn: 'arn:aws:iam::aws:policy/AdministratorAccess',
        RoleName: roleRes.Role.RoleName
      }))
    } else {
      // attach managed polices
      const attachedPolices = await iamClient.send(new ListAttachedUserPoliciesCommand({
        UserName: username
      }))

      await attachManagedPolicies(roleName, attachedPolices.AttachedPolicies)

      // attach inline polices
      const inlinePolices = await iamClient.send(new ListUserPoliciesCommand({
        UserName: username
      }))

      for (const policyName of inlinePolices.PolicyNames ?? []) {
        const policyDocument = await iamClient.send(
          new GetUserPolicyCommand({ UserName: username, PolicyName: policyName })
        );

        if (!policyDocument.PolicyDocument) continue;

        await iamClient.send(new PutRolePolicyCommand({
          PolicyName: policyName,
          PolicyDocument: decodeURIComponent(policyDocument.PolicyDocument),
          RoleName: roleRes.Role.RoleName
        }))
      }

      const groups = await iamClient.send(new ListGroupsForUserCommand({
        UserName: username
      }));

      for (const group of groups.Groups ?? []) {
        // attach managed polices
        const attachedPolices = await iamClient.send(new ListAttachedGroupPoliciesCommand({
          GroupName: group.GroupName
        }))

        await attachManagedPolicies(roleName, attachedPolices.AttachedPolicies)

        // attach inline polices
        const inlinePolices = await iamClient.send(new ListGroupPoliciesCommand({
          GroupName: group.GroupName
        }))

        for (const policyName of inlinePolices.PolicyNames ?? []) {
          const policyDocument = await iamClient.send(
            new GetUserPolicyCommand({ UserName: username, PolicyName: policyName })
          );

          if (!policyDocument.PolicyDocument) continue;
          await iamClient.send(new PutRolePolicyCommand({
            PolicyName: policyName,
            PolicyDocument: decodeURIComponent(policyDocument.PolicyDocument),
            RoleName: roleRes.Role.RoleName
          }))
        }
      }
    }

    const yamlFile = getYAMLFile({ ...props, roleArn: roleRes.Role.Arn, region: await stsClient.config.region() })
    fs.writeFileSync(deployYamlPath, yamlFile)
  }

  const { infraFile, cdkJsonFile } = getInfra({
    app: props.app,
    domain: props.domainName
      ? `process.env.ENVIRONMENT === "production" ? "${props.domainName}" : \`\${process.env.ENVIRONMENT}.${props.domainName}\``
      : undefined
  })

  const packageJsonPath = path.join(workingDir, 'package.json')
  const infraPath = path.join(workingDir, 'infra.js')
  const cdkPath = path.join(workingDir, 'cdk.json')

  if (!fs.existsSync(packageJsonPath)) throw new Error('unable to find package.json file')
  if (fs.existsSync(infraPath)) throw new Error('infra.js file already exists')

  const packageJsonFile = JSON.parse(fs.readFileSync(path.join(workingDir, 'package.json'), "utf8"))

  packageJsonFile["devDependencies"] = {
    ...packageJsonFile["devDependencies"],
    "aws-cdk": "^2.1016.1",
    "aws-cdk-lib": "^2.198.0",
    "@aws-sdk/client-sts": "^3.799.0",
    "constructs": "^10.4.2",
    "@fy-stack/fullstack-construct": "^0.0.144"
  }

  if (!fs.existsSync(cdkPath)) fs.writeFileSync(cdkPath, cdkJsonFile)
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonFile, null, 2))
  fs.writeFileSync(infraPath, infraFile)

  console.log("App initialized, run npm install to complete")
}