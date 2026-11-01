'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const {build} = require('./build.cjs');
const {unpack, deploy} = require('./remote-deploy.cjs');

(async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'frontline-deploy-test-'));
  try {
    const game = path.join(temporary, 'game');
    const source = {
      'server.cjs': 'console.log("fixture");',
      'package.json': '{"name":"fixture"}',
      'dist/index.html': '<!doctype html><title>fixture</title>',
      'dist/client.js': 'const fixture = 1;',
      'dist/engine.js': 'module.exports = {};',
      'dist/balance/balance.js': 'module.exports = {};'
    };
    for (const [name, data] of Object.entries(source)) {
      const file = path.join(game, name);
      fs.mkdirSync(path.dirname(file), {recursive: true});
      fs.writeFileSync(file, data);
    }
    const commit = 'a'.repeat(40);
    const payload = build(game, commit);
    assert.equal(unpack(payload, commit).size, 6);
    const alter = fn => {
      const manifest = JSON.parse(zlib.gunzipSync(payload).toString('utf8'));
      fn(manifest);
      return zlib.gzipSync(Buffer.from(JSON.stringify(manifest)));
    };
    for (const name of ['../server.cjs', '/etc/passwd', 'dist/../server.js', 'dist//file.js', 'dist/back\\slash.js', 'dist/./file.js']) {
      assert.throws(() => unpack(alter(m => {m.files[0].path = name;}), commit), /Unsafe/);
    }
    assert.throws(() => unpack(payload, 'b'.repeat(40)), /manifest/);
    assert.throws(() => unpack(alter(m => {m.files.push(m.files[0]);}), commit), /duplicate/);
    assert.throws(() => unpack(alter(m => {m.files[0].sha256 = '0'.repeat(64);}), commit), /checksum/);

    const releases = path.join(temporary, 'releases');
    const oldVersion = path.join(temporary, 'old');
    fs.mkdirSync(oldVersion);
    let current = oldVersion;
    let restarts = 0;
    const options = {
      releaseRoot: releases,
      currentTarget: () => current,
      swapCurrent: target => {current = target;},
      restart: () => {restarts++;},
      health: async () => true
    };
    const release = await deploy(payload, commit, options);
    assert.equal(current, release);
    assert.equal(fs.readFileSync(path.join(release, 'server.cjs'), 'utf8'), source['server.cjs']);
    assert.equal(restarts, 1);
    const beforeFailure = current;
    await assert.rejects(deploy(payload, commit, {...options, health: async () => false}), /previous version restored/);
    assert.equal(current, beforeFailure);
    assert.equal(restarts, 3);
    assert(fs.existsSync(oldVersion));

    const broken = alter(m => {
      const file = m.files.find(f => f.path === 'server.cjs');
      const content = Buffer.from('this is not valid javascript !!!');
      file.data = content.toString('base64');
      file.sha256 = crypto.createHash('sha256').update(content).digest('hex');
    });
    await assert.rejects(deploy(broken, commit, options), /Syntax check failed/);
    assert.equal(current, beforeFailure);
    assert.equal(restarts, 3);
    assert(!fs.readdirSync(releases).some(n => n.startsWith('.incoming-')));
    console.log('Deployment: packaging, checksums, path rejection, successful release, health rollback and syntax failure preservation passed');
  } finally {
    if (path.dirname(temporary) === path.resolve(os.tmpdir()) && path.basename(temporary).startsWith('frontline-deploy-test-')) {
      fs.rmSync(temporary, {recursive: true, force: true});
    }
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
