import * as fs from 'node:fs';
import * as path from 'node:path';

export const version: string = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
).version;
