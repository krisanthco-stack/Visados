'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

test('electron-builder is forced to build only and never publish directly',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.match(pkg.scripts?.['dist:win']||'',/--publish\s+never/);
});

test('GitHub Actions release upload uses the repository automatic token explicitly',()=>{
  const workflow=read('.github/workflows/windows-release.yml');
  assert.match(workflow,/permissions:\s*\n\s*contents:\s*write/);
  assert.match(workflow,/token:\s*\$\{\{\s*github\.token\s*\}\}/);
  assert.doesNotMatch(workflow,/GH_TOKEN/);
  assert.match(workflow,/softprops\/action-gh-release@v2/);
});
