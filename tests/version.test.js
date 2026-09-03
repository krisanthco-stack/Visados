const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('release version is 4.0.0 across app, PWA, exporters, backend and service worker',()=>{
  assert.equal(read('VERSION.txt').trim(),'4.0.0');
  assert.match(read('js/app.js'),/APP_VERSION='4\.0\.0'/);
  assert.match(read('js/exporters.js'),/VERSION='4\.0\.0'/);
  assert.match(read('js/pwa.js'),/PWA_VERSION\s*=\s*'4\.0\.0'/);
  assert.match(read('sw.js'),/VERSION='4\.0\.0'/);
  assert.match(read('server/server.cjs'),/version:'4\.0\.0'/);
});

test('service worker caches intake, workflow, reader, daily and attachment modules',()=>{
  const sw=read('sw.js');
  for(const f of ['./js/intake.js','./js/workflow.js','./js/reader.js','./js/daily.js','./js/attachments.js']) assert.match(sw,new RegExp(f.replace(/[./]/g,'\\$&')));
});
