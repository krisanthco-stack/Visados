const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('report layout helper is loaded before exporters in the application',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const layout=html.indexOf('./js/report-layout.js');
  const exporters=html.indexOf('./js/exporters.js');
  assert.ok(layout>=0,'report-layout.js is not loaded');
  assert.ok(exporters>layout,'report-layout.js must load before exporters.js');
});

test('service worker caches the new rejection continuation and receipt backgrounds',()=>{
  const sw=fs.readFileSync('sw.js','utf8');
  assert.match(sw,/OFICIAL_RECHAZO_CONTINUACION\.png/);
  assert.match(sw,/OFICIAL_RECHAZO_RECIBO\.png/);
  assert.match(sw,/js\/report-layout\.js/);
});

test('rejection renderer paginates observations before reasons',()=>{
  const src=fs.readFileSync('js/exporters.js','utf8');
  assert.match(src,/function drawObservationRows\(/);
  assert.match(src,/obsIndex/);
  assert.match(src,/OBSERVACIONES \(CONTINUACIÓN\)/);
});

test('first rejection page uses available page space before deferring reasons',()=>{
  const src=fs.readFileSync('js/exporters.js','utf8');
  assert.doesNotMatch(src,/limit=\.95\*H-closingHeight\(x\)-gap/);
  assert.match(src,/tableY=Math\.max\(\.421\*H,obsRes\.y\+gap\),limit=\.90\*H/);
});

test('approval renderer clears complete variable regions without erasing table borders',()=>{
  const src=fs.readFileSync('js/exporters.js','utf8');
  assert.match(src,/function drawApprovalVariables\(/);
  assert.match(src,/x\.fillRect\(\.70\*W,\.146\*H,\.29\*W,\.050\*H\)/);
  assert.match(src,/let bounds=\[72,251,493,731,1030,1338\]/);
  assert.doesNotMatch(src,/\.488\*H/);
});

test('approval renderer redraws complete date and trámite labels to avoid leftover glyphs',()=>{
  const src=fs.readFileSync('js/exporters.js','utf8');
  assert.match(src,/drawText\(x,'Fecha: '\+dateEs\(/);
  assert.match(src,/drawText\(x,'Trámite: '\+\(e\.tramite\|\|''\)/);
});

test('approval office-number mask stays inside the blue header',()=>{
  const src=fs.readFileSync('js/exporters.js','utf8');
  assert.match(src,/x\.fillRect\(\.78\*W,\.087\*H,\.175\*W,\.024\*H\)/);
});

test('Word approval patches labeled date/trámite and table values',()=>{
  const src=fs.readFileSync('js/exporters.js','utf8');
  assert.match(src,/function patchApprovalBody\(/);
  assert.match(src,/else xml=patchApprovalBody\(xml,e,pp\)/);
});

test('Word rejection preserves the OFICIO NÚMERO line break while changing only its value',()=>{
  const src=fs.readFileSync('js/exporters.js','utf8');
  assert.match(src,/function patchOfficeHeaderNumber\(/);
  assert.match(src,/isRej\?patchOfficeHeaderNumber\(xml,e\.tramite\|\|''\)/);
});

test('Word rejection starts the closing block on a new page when there are many defects',()=>{
  const src=fs.readFileSync('js/exporters.js','utf8');
  assert.match(src,/function pageBreakBefore\(/);
  assert.match(src,/protectClosingBlocks\(doc,defs\.length>=7\|\|obs\.length>=9\)/);
});
