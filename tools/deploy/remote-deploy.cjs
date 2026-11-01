'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const {spawnSync} = require('node:child_process');

const LIMIT = 32 * 1024 * 1024;
function unpack(data, commit) {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid commit');
  if (data.length > LIMIT) throw new Error('Bundle too large');
  const manifest = JSON.parse(zlib.gunzipSync(data, {maxOutputLength: LIMIT * 2}).toString('utf8'));
  if (manifest.format !== 1 || manifest.commit !== commit || !Array.isArray(manifest.files) || manifest.files.length > 2000) throw new Error('Invalid manifest');
  const files = new Map();
  let total = 0;
  for (const entry of manifest.files) {
    const name = entry.path;
    if (typeof name !== 'string' || !/^(server\.cjs|package\.json|dist\/[A-Za-z0-9_.\/-]+\.(?:js|css|html|zip))$/.test(name)
      || name.split('/').some(p => !p || p === '.' || p === '..') || files.has(name)) throw new Error('Unsafe or duplicate file');
    if (typeof entry.data !== 'string') throw new Error('Invalid file data');
    const content = Buffer.from(entry.data, 'base64');
    if (content.toString('base64') !== entry.data || crypto.createHash('sha256').update(content).digest('hex') !== entry.sha256) throw new Error('Invalid file checksum');
    total += content.length;
    if (total > LIMIT) throw new Error('Files too large');
    files.set(name, content);
  }
  for (const name of ['server.cjs', 'package.json', 'dist/index.html', 'dist/client.js', 'dist/engine.js', 'dist/balance/balance.js']) {
    if (!files.has(name)) throw new Error('Missing file: ' + name);
  }
  JSON.parse(files.get('package.json').toString('utf8'));
  return files;
}

function systemctl(command) {
  const result = spawnSync('/usr/bin/systemctl', [command, 'frontline.service'], {encoding: 'utf8'});
  if (result.status !== 0) throw new Error(result.stderr || 'systemctl failed');
}
function swapCurrent(target) {
  const temporary = '/opt/frontline-current.next-' + process.pid;
  fs.symlinkSync(target, temporary);
  fs.renameSync(temporary, '/opt/frontline-current');
}
async function health() {
  for (let n = 0; n < 20; n++) {
    try {
      const response = await fetch('http://127.0.0.1/api/info', {signal: AbortSignal.timeout(1000)});
      if (response.ok && (await response.json()).frontlineServer) return true;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

async function deploy(data, commit, options = {}) {
  const files = unpack(data, commit);
  const root = options.releaseRoot || '/opt/frontline-releases';
  const currentTarget = options.currentTarget || (() => fs.realpathSync('/opt/frontline-current'));
  const swap = options.swapCurrent || swapCurrent;
  const restart = options.restart || (() => systemctl('restart'));
  const checkHealth = options.health || health;
  fs.mkdirSync(root, {recursive: true, mode: 0o755});
  let staging = fs.mkdtempSync(path.join(root, '.incoming-'));
  let release;
  let previous;
  try {
    for (const [name, content] of files) {
      const target = path.join(staging, name);
      fs.mkdirSync(path.dirname(target), {recursive: true, mode: 0o755});
      fs.writeFileSync(target, content, {mode: 0o644, flag: 'wx'});
      if (/\.(?:js|cjs)$/.test(name)) {
        const parsed = spawnSync(process.execPath, ['--check', target], {encoding: 'utf8', timeout: 10000});
        if (parsed.status !== 0) throw new Error('Syntax check failed: ' + name + '\n' + (parsed.stderr || ''));
      }
    }
    fs.writeFileSync(path.join(staging, '.release.json'), JSON.stringify({commit, date: new Date().toISOString()}), {mode: 0o644});
    fs.chmodSync(staging, 0o755);
    release = path.join(root, commit + '-' + Date.now());
    fs.renameSync(staging, release);
    staging = null;
    previous = currentTarget();
    swap(release);
    try {
      restart();
      if (!await checkHealth()) throw new Error('New version failed its health check');
    } catch (error) {
      swap(previous);
      restart();
      throw new Error(error.message + '; previous version restored');
    }
    console.log('DEPLOYED ' + commit);
    return release;
  } finally {
    if (staging && path.dirname(staging) === path.resolve(root) && path.basename(staging).startsWith('.incoming-')) fs.rmSync(staging, {recursive: true, force: true});
  }
}

if (require.main === module) {
  (async () => {
    const chunks = [];
    let size = 0;
    for await (const chunk of process.stdin) {
      size += chunk.length;
      if (size > LIMIT) throw new Error('Bundle too large');
      chunks.push(chunk);
    }
    await deploy(Buffer.concat(chunks), process.argv[2]);
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = {unpack, deploy};
