const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const intake=require('../js/intake.js');

test('PDF/OCR reader autofill is restricted to solicitante, trámite and presentación',()=>{
  const detected={
    solicitante:'Ana Pérez',tramite:'VMSDC-2026-45251',presentacion:'2026-155222-C',
    folio:'4-00159830-000',plano:'A-1234567-2025',fecha:'2026-09-02',distrito:'Horquetas'
  };
  const pdf=intake.readerAutofillRecord(detected,'PDF');
  const ocr=intake.readerAutofillRecord(detected,'OCR');
  assert.deepEqual(pdf,{solicitante:'Ana Pérez',tramite:'VMSDC-2026-45251',presentacion:'2026-155222-C'});
  assert.deepEqual(ocr,pdf);
});

test('web reader keeps its existing extraction capability while shared fields remain first-wins',()=>{
  const detected={solicitante:'Ana Pérez',tramite:'VMSDC-2026-45251',presentacion:'2026-155222-C',folio:'4-00159830-000'};
  assert.deepEqual(intake.readerAutofillRecord(detected,'SCRAPER'),detected);
  const target={solicitante:'Manual',tramite:'VMSDC-2026-1',presentacion:'2026-1-C'};
  const result=intake.mergeDetectedFields({...target},detected,{sourceType:'SCRAPER'});
  assert.equal(result.case.solicitante,'Manual');
  assert.equal(result.case.tramite,'VMSDC-2026-1');
  assert.equal(result.case.presentacion,'2026-1-C');
});

test('highlight parser only accepts the three target fields and never treats a folio as trámite',()=>{
  assert.equal(intake.highlightFieldValue('solicitante','  Solicitante:\n Ana   Pérez  '),'Ana Pérez');
  assert.equal(intake.highlightFieldValue('tramite','VMSDC-2026-45251'),'VMSDC-2026-45251');
  assert.equal(intake.highlightFieldValue('tramite','4-00159830-000'),'');
  assert.equal(intake.highlightFieldValue('presentacion','Presentación: 2026-155222-C'),'2026-155222-C');
  assert.equal(intake.highlightFieldValue('folio','4-00159830-000'),'');
});

test('reader UI is resizable and exposes highlight-to-fill controls',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../css/app.css'),'utf8');
  const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
  for(const id of ['readerSelectionMenu','readerFillSolicitante','readerFillTramite','readerFillPresentacion']){
    assert.match(html,new RegExp(`id=["']${id}["']`));
  }
  assert.match(css,/\.reader-panel\{[^}]*resize\s*:\s*both/i);
  assert.match(css,/\.reader-panel\{[^}]*min-height/i);
  assert.match(css,/\.reader-panel\{[^}]*max-height/i);
  assert.match(app,/readerFillSelection/);
  assert.match(app,/selectionchange/);
});

test('selecting a PDF or image still starts reading automatically without a separate read button',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
  assert.match(app,/readerFile[^\n]*onchange[^\n]*readerReadFile/);
});
