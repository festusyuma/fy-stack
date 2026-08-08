import fs from 'node:fs';
import path from 'node:path';

import { Construct } from 'constructs';

import { NodeAppCode } from './node-app-code';
import type { StandaloneApp } from './types';

export type NodeApiCodeProps = StandaloneApp & {
  cmd: string;
};

export class NodeApiCode extends NodeAppCode {
  constructor(scope: Construct, id: string, props: NodeApiCodeProps) {
    fs.writeFileSync(path.join(props.output, 'run.sh'), props.cmd);

    super(scope, id, { ...props, handler: 'run.sh' });
  }
}
