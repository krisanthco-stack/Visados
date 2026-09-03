const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const intake=require('../js/intake.js');

test('reader module exists and exposes graceful browser reader',()=>{
  const p=path.join(__dirname,'../js/reader.js');
  assert.equal(fs.existsSync(p),true);
  const src=fs.readFileSync(p,'utf8');
  assert.match(src,/CVISADOS_READER/);
  assert.match(src,/readUrl/);
  assert.match(src,/readFile/);
  assert.match(src,/Tesseract/);
  assert.match(src,/pdfjsLib/);
});

test('tramites UI includes split reader panel and file input',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  for(const id of ['readerPanel','readerUrl','readerFrame','readerBackendPreview','readerFile','readerStatus']){
    assert.match(html,new RegExp(`id=["']${id}["']`));
  }
  const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
  assert.match(app,/openReader/);
});

test('reader supports a configurable backend URL for static PWA deployments',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/\.\/js\/config\.js/);
  assert.match(app,/CVISADOS_BACKEND_URL/);
});

test('extracts Metro trámite variants and Spanish long dates',()=>{
  const a=intake.extractCaseFields('Trámite: VMSDC-2026-45251\nFecha: 02 de septiembre de 2026');
  assert.equal(a.tramite,'VMSDC-2026-45251');
  assert.equal(a.fecha,'2026-09-02');
  const b=intake.extractCaseFields('N° trámite: VMSDC/2026/45252');
  assert.equal(b.tramite,'VMSDC/2026/45252');
});

test('merge reports detected conflicts without overwriting established values',()=>{
  const original={folio:'4-00159830-000',distrito:'Horquetas',tramite:'VMSDC 2026-1'};
  const merged=intake.mergeDetectedFields({...original},{folio:'4-00999999-000',distrito:'Puerto Viejo',tramite:'VMSDC 2026-2'},{sourceType:'WEB'});
  assert.equal(merged.case.folio,original.folio);
  assert.equal(merged.case.distrito,original.distrito);
  assert.equal(merged.case.tramite,original.tramite);
  assert.deepEqual(merged.conflicts.map(c=>c.field).sort(),['distrito','folio','tramite']);
});

test('reader security helper only allows HTTPS Metro URLs for embedded web reading',()=>{
  assert.equal(intake.isAllowedMetroUrl('https://metro.sarapiqui.go.cr/id/123'),true);
  assert.equal(intake.isAllowedMetroUrl('http://metro.sarapiqui.go.cr/id/123'),false);
  assert.equal(intake.isAllowedMetroUrl('https://example.com/id/123'),false);
  const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
  assert.match(app,/isAllowedMetroUrl\(metro\.url\)/);
});
