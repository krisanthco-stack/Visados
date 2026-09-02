const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=()=>fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const app=()=>fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
const exp=()=>fs.readFileSync(path.join(__dirname,'../js/exporters.js'),'utf8');
const css=()=>fs.readFileSync(path.join(__dirname,'../css/app.css'),'utf8');

test('Trámites and Calificación expose alarm filters',()=>{
 const h=html();
 assert.match(h,/id="fAlert"/);
 assert.match(h,/id="calAlert"/);
 assert.match(app(),/function matchesAlertFilter/);
});

test('Gestión exposes daily controls and daily exports',()=>{
 const h=html();
 for(const id of ['gDay','gDayCreated','gDayManaged','gDayApproved','gDayRejected']) assert.match(h,new RegExp(`id="${id}"`));
 assert.match(exp(),/function exportDailyGestionExcel/);
 assert.match(exp(),/function downloadDailyDocumentsZip/);
});

test('UI contains compact split-view styling',()=>{
 const c=css();
 assert.match(c,/\.reader-split/);
 assert.match(c,/\.density-compact/);
});

test('Gestión PDF actions stay in Gestión and archived copy is definitive',()=>{
 const e=exp();
 assert.match(e,/Generar PDF de rechazo/);
 assert.match(e,/Generar PDF de aprobación/);
 assert.doesNotMatch(e,/Resoluciones \/ PDF de rechazo/);
 assert.doesNotMatch(e,/Reábralo desde Resoluciones/);
});

test('main navigation names the terminal module Gestiones while keeping internal route compatibility',()=>{
 const h=html();
 assert.match(h,/data-page="gestion"[^>]*>[\s\S]*?Gestiones<\/button>/);
});

test('compact Calificación keeps expediente, alarmas, encargado and action in one horizontal row on desktop',()=>{
 const c=css();
 assert.match(c,/\.density-compact \.cal-top\s*\{[^}]*grid-template-columns\s*:\s*minmax\(200px,1fr\)\s+minmax\(145px,\.55fr\)\s+minmax\(200px,\.8fr\)\s+auto/s);
});
