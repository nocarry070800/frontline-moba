'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Use Node.js 24');
function run(args) {
  const result = spawnSync(process.execPath, args, {cwd: root, stdio: 'inherit'});
  if (result.status !== 0) process.exit(result.status || 1);
}
function walk(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), {withFileTypes: true})) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(?:js|cjs)$/.test(file)) run(['--check', file]);
  }
}
run(['--check', 'server.cjs']);
walk('dist');
run(['tests/served-assets.cjs']);
console.log('Game syntax and HTTP delivery passed');
