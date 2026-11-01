'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

function build(root, commit) {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('A full Git commit SHA is required');
  const names = ['server.cjs', 'package.json'];
  function walk(dir) {
    for (const entry of fs.readdirSync(path.join(root, dir), {withFileTypes: true})) {
      const name = dir + '/' + entry.name;
      if (entry.isSymbolicLink()) throw new Error('Symlinks are not allowed: ' + name);
      if (entry.isDirectory()) walk(name);
      else if (entry.isFile()) names.push(name);
      else throw new Error('Unsupported file: ' + name);
    }
  }
  walk('dist');
  const files = names.sort().map(name => {
    const data = fs.readFileSync(path.join(root, name));
    return {path: name, data: data.toString('base64'), sha256: crypto.createHash('sha256').update(data).digest('hex')};
  });
  return zlib.gzipSync(Buffer.from(JSON.stringify({format: 1, commit, files})), {level: 9});
}

if (require.main === module) {
  const [output, commit] = process.argv.slice(2);
  if (!output) throw new Error('Usage: node tools/deploy/build.cjs OUTPUT COMMIT');
  fs.writeFileSync(output, build(path.resolve(__dirname, '../..'), commit));
  console.log('Deployment bundle created:', output);
}
module.exports = {build};
