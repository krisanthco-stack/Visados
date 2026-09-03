const test=require('node:test');
const assert=require('node:assert/strict');
const intake=require('../js/intake.js');

test('preserves a valid Metro URL exactly',()=>{
  const url='https://metro.sarapiqui.go.cr/expediente/ABC-123?x=1';
  assert.deepEqual(intake.normalizeMetroLink(url),{id:'',url});
});

test('turns a plain Metro ID into the canonical /id/ URL',()=>{
  assert.deepEqual(intake.normalizeMetroLink('45251'),{
    id:'45251',url:'https://metro.sarapiqui.go.cr/id/45251'
  });
});

test('extracts core case fields from reader text without throwing on missing values',()=>{
  const r=intake.extractCaseFields('Número de Trámite: VMSDC 2026-45251 Folio Real: 4-00159830-000 Plano: A-1234567-2025 Presentación: 2026-155222-C Fecha: 02/09/2026');
  assert.equal(r.tramite,'VMSDC 2026-45251');
  assert.equal(r.folio,'4-00159830-000');
  assert.equal(r.plano,'A-1234567-2025');
  assert.equal(r.presentacion,'2026-155222-C');
  assert.equal(r.fecha,'2026-09-02');
});

test('reader merge fills blanks but never overwrites established case values',()=>{
  const target={folio:'4-OLD-000',plano:'',tramite:''};
  const result=intake.mergeDetectedFields(target,{folio:'4-NEW-000',plano:'A-1',tramite:'VMSDC 2026-1'},{sourceType:'WEB'});
  assert.equal(result.case.folio,'4-OLD-000');
  assert.equal(result.case.plano,'A-1');
  assert.equal(result.case.tramite,'VMSDC 2026-1');
  assert.equal(result.assignedTramite,true);
});

test('manual sources cannot assign a new trámite number',()=>{
  assert.equal(intake.sourceMayAssignTramite('MANUAL'),false);
  assert.equal(intake.sourceMayAssignTramite('Excel'),true);
  assert.equal(intake.sourceMayAssignTramite('PDF'),true);
  assert.equal(intake.sourceMayAssignTramite('SCRAPER'),true);
});

test('extracts optional resolution fields when present and leaves them blank otherwise',()=>{
  const r=intake.extractCaseFields('Área: 1952.00 m² Distrito: Las Horquetas Correo: persona@example.com');
  assert.equal(r.area,'1952.00 m²');
  assert.equal(r.distrito,'Las Horquetas');
  assert.equal(r.correo,'persona@example.com');
  const empty=intake.extractCaseFields('texto sin esos datos');
  assert.equal(empty.area,'');
  assert.equal(empty.distrito,'');
  assert.equal(empty.correo,'');
});

test('ZIP-contained PDF/Excel/CSV are also authorized linkage sources',()=>{
  assert.equal(intake.sourceMayAssignTramite('ZIP-PDF'),true);
  assert.equal(intake.sourceMayAssignTramite('ZIP-Excel'),true);
  assert.equal(intake.sourceMayAssignTramite('ZIP-CSV'),true);
});
