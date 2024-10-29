import child_process from 'node:child_process';
import fs from 'node:fs';

import { Construct } from 'constructs';

import { NestConstruct } from './nest-construct';
import { AppProperties } from './types';

export class NestApiConstruct extends NestConstruct {
  constructor(scope: Construct, id: string, props: AppProperties) {
    super(scope, id, { ...props, webLayer: true });
  }

  static override clean(output: string, name: string, command: string) {
    const destination = `./dist/${name}`;

    /** Delete previous cleaned files */
    fs.rmSync(destination, { recursive: true, force: true });

    /** Create server and static folders for deployment */
    fs.mkdirSync(destination, { recursive: true });

    /** copy compiled code to be deployed to the server */
    fs.cpSync(output, destination, { recursive: true });

    /** copy start command to script */
    fs.writeFileSync(`${destination}/run.sh`, command);

    console.log(
      child_process
        .execSync(`npm ci`, {
          stdio: 'pipe',
          cwd: destination,
        })
        .toString()
    );

    return { serverOutput: destination };
  }
}
