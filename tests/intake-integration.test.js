const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const intake=require('../js/intake.js');
const read=p=>fs.readFileSync(p,'utf8');

test('new manual and imported cases do not manufacture X:NNN trámite numbers',()=>{
  const src=read('js/app.js');
  const save=(src.match(/function saveNew\(\)[\s\S]*?function loadPre/)||[''])[0];
  assert.match(save,/tramite:\s*''/);
  assert.doesNotMatch(save,/nextProvisionalTramite\(\)/);
  const imported=(src.match(/function newImportedCase\([\s\S]*?function incomingConflictWithReal/)||[''])[0];
  assert.match(imported,/tramite:\s*real/);
  assert.doesNotMatch(imported,/real=nextProvisionalTramite\(\)/);
});

test('manual creation accepts folio, plano or presentación and shows trámite as linked-only',()=>{
  const html=read('index.html');
  assert.match(html,/id="nFolio"[\s\S]*id="nPlano"[\s\S]*id="nPresent"[\s\S]*id="nTramite"/);
  assert.match(html,/id="nTramite"[^>]*readonly/);
  const src=read('js/app.js');
  assert.match(src,/if\(!folio&&!plano&&!pres\)/);
});

test('plano participates as an independent reference for linkage',()=>{
  const src=read('js/app.js');
  assert.match(src,/hasReference[\s\S]*plano/);
  assert.match(src,/referenceOverlap[\s\S]*plano/);
});

test('Metro ID aliases and URL normalization are connected to imported records',()=>{
  const src=read('js/app.js');
  assert.match(src,/metroId:\[/);
  assert.match(src,/metroUrl:\[/);
  assert.match(src,/CVISADOS_INTAKE\.normalizeMetroLink/);
});

test('XLSX parser resolves sheet hyperlink relationships before record mapping',()=>{
  const src=read('js/app.js');
  assert.match(src,/sheetName\.replace\('\.xml','\.xml\.rels'\)/);
  assert.match(src,/hyperlink/);
  assert.match(src,/relationships\/hyperlink/);
});

test('allowed imported sources can assign trámite while manual cannot',()=>{
  assert.equal(intake.sourceMayAssignTramite('Excel'),true);
  assert.equal(intake.sourceMayAssignTramite('PDF'),true);
  assert.equal(intake.sourceMayAssignTramite('WEB'),true);
  assert.equal(intake.sourceMayAssignTramite('MANUAL'),false);
});

test('upsert only accepts an incoming trámite number from allowed source types',()=>{
  const src=read('js/app.js');
  const block=(src.match(/function upsertImported\([\s\S]*?function statsNew/)||[''])[0];
  assert.match(block,/sourceMayAssignTramite\(source\.type/);
  assert.match(block,/if\(!sourceAllowsTramite\)real=''/);
});

test('records without a real trámite update a compatible unassigned case before creating another',()=>{
  const src=read('js/app.js');
  const block=(src.match(/function upsertImported\([\s\S]*?function statsNew/)||[''])[0];
  assert.match(block,/let unassigned=pickProvisionalCandidate\(r\)/);
  assert.match(block,/updateImportedFields\(unassigned,r\)/);
});
