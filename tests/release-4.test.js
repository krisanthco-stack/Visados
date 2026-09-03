'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

test('C-VISADOS 4.0.0 is the release version everywhere',()=>{
  assert.equal(read('VERSION.txt').trim(),'4.0.0');
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.version,'4.0.0');
  assert.match(read('js/app.js'),/APP_VERSION='4\.0\.0'/);
  assert.match(read('js/exporters.js'),/VERSION='4\.0\.0'/);
  assert.match(read('server/server.cjs'),/version:'4\.0\.0'/);
});

test('both approval and rejection PDF outputs use US Letter pages',()=>{
  const src=read('js/exporters.js');
  assert.match(src,/pageW=612,pageH=792/);
  assert.doesNotMatch(src,/pageW=isRej\?612:595/);
  assert.match(src,/paper='8\.5in'/);
});

test('generated Word output forces Letter paper without modifying source machotes',()=>{
  const src=read('js/exporters.js');
  assert.match(src,/function forceLetterSection\(/);
  assert.match(src,/forceLetterSection\(xml\)/);
  assert.match(src,/12240/);
  assert.match(src,/15840/);
});

test('Resoluciones is horizontal above a full-width preview',()=>{
  const html=read('index.html');
  const css=read('css/app.css');
  assert.match(html,/class="resolution-top"/);
  assert.match(html,/class="resolution-preview"/);
  assert.match(css,/\.resolution-top\s*\{[^}]*grid-template-columns/s);
  assert.match(css,/\.resolution-preview\s*\{[^}]*width\s*:\s*100%/s);
  assert.doesNotMatch(css,/#page-cierre>\.grid2\{grid-template-columns:minmax\(350px/);
});

test('date and tramite text boxes share the same right edge as report tables',()=>{
  const src=read('js/exporters.js');
  assert.match(src,/REPORT_RIGHT_EDGE\s*=\s*\.945/);
  assert.match(src,/drawTextFit\(ctx,dateEs\([^\n]+REPORT_RIGHT_EDGE\*W-dateX/);
  assert.match(src,/drawTextFit\(x,'Fecha: '\+dateEs\([^\n]+REPORT_RIGHT_EDGE\*W-dateX/);
});

test('office downloads use the real tramite number as filename when available',()=>{
  const src=read('js/exporters.js');
  assert.match(src,/function officeFileBase\(/);
  assert.match(src,/blobDownload\(bytes,`\$\{officeFileBase\(e\)\}\.docx`/);
  assert.match(src,/blobDownload\(pdf,`\$\{officeFileBase\(e\)\}\$\{editable\?'_EDITABLE':''\}\.pdf`/);
  assert.match(src,/name:`oficios\/\$\{officeFileBase\(e\)\}\.pdf`/);
  assert.doesNotMatch(src,/\$\{safe\(e\.tramite\|\|caseRef\(e\)\)\}_\$\{e\.dictamen\}/);
});

test('GitHub installer build cannot require GH_TOKEN during electron-builder',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.match(pkg.scripts['dist:win'],/--publish\s+never/);
  const workflow=read('.github/workflows/windows-release.yml');
  assert.match(workflow,/npm run dist:win/);
  assert.match(workflow,/token:\s*\$\{\{\s*github\.token\s*\}\}/);
  assert.doesNotMatch(workflow,/GH_TOKEN/);
});

test('GitHub setup does not request npm cache without a lock file',()=>{
  const workflow=read('.github/workflows/windows-release.yml');
  assert.equal(fs.existsSync(path.join(ROOT,'package-lock.json')),false);
  assert.doesNotMatch(workflow,/cache:\s*npm/);
  assert.match(workflow,/npm install --no-audit --no-fund/);
});
