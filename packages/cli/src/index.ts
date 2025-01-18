#!/usr/bin/env node

import { confirm, input } from '@inquirer/prompts';
import { program } from "commander"

import { initApp } from './commands/init-app';

program
  .name('fy-stack')
  .version("0.0.131")
  .description('Fy-Stack CLI');

program
  .command("init")
  .description("Initialize application infrastructure")
  .requiredOption("-a --app <string>", "Application name")
  .action(async (params) => {
    let githubRepo: string | undefined

    const setupGitHub = await confirm({ message: "Setup github deployment", default: true });
    if (setupGitHub) {
      githubRepo = await input({
        message: "Enter repository full name (e.g. Org/repository)",
        required: true,
        validate: (v) => v.length > 0,
      })
    }

    const domainName = await input({ message: "Enter domain name (leave blank if none)", required: false })

    return initApp({ ...params, githubRepo, domainName });
  })

program.parse();