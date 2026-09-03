const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=p=>fs.readFileSync(p,'utf8');

test('workflow helper loads before app and the qualification action is a single finalizing button',()=>{
  const html=read('index.html');
  const workflow=html.indexOf('./js/workflow.js'), app=html.indexOf('./js/app.js');
  assert.ok(workflow>=0&&app>workflow,'workflow.js must load before app.js');
  assert.match(html,/Guardar, finalizar y enviar a Resoluciones/);
  assert.doesNotMatch(html,/>Guardar calificación</);
});

test('Gestión result filter contains only approved and rejected and includes review panel',()=>{
  const html=read('index.html');
  const resultBlock=(html.match(/<select id="gResultado">[\s\S]*?<\/select>/)||[''])[0];
  assert.match(resultBlock,/APROBADO/);
  assert.match(resultBlock,/RECHAZADO/);
  assert.doesNotMatch(resultBlock,/PENDIENTE/);
  assert.match(html,/id="gestionReview"/);
  assert.match(html,/Subsanación \/ corrección/);
});

test('Trámites and operational selectors use qualification-finalized boundary instead of resolution finalizado',()=>{
  const src=read('js/app.js');
  assert.match(src,/CVISADOS_WORKFLOW\.isTramitesCase/);
  assert.match(src,/function renderTable\([\s\S]*?isTramitesCase/);
  assert.match(src,/function renderPreSelect\(\)[\s\S]*?isTramitesCase/);
  assert.match(src,/function renderInspectionSelect\(\)[\s\S]*?isTramitesCase/);
  assert.match(src,/function renderMotorSelect\(\)[\s\S]*?isTramitesCase/);
});

test('finishing qualification sends the case to Resoluciones/Gestión and preserves workflow timestamps',()=>{
  const src=read('js/app.js');
  assert.match(src,/CVISADOS_WORKFLOW\.finishQualification/);
  assert.match(src,/Calificación finalizada y enviada a Resoluciones/);
  assert.match(src,/currentClose=e\.id/);
  assert.match(src,/go\('cierre'\)/);
});

test('Gestión only renders finalized qualifications and implements subsanation/archive/pdf actions',()=>{
  const src=read('js/exporters.js');
  assert.match(src,/CVISADOS_WORKFLOW\.isGestionCase/);
  assert.match(src,/function renderGestionReview\(/);
  assert.match(src,/function saveSubsanationReview\(/);
  assert.match(src,/CVISADOS_WORKFLOW\.reviewSubsanation/);
  assert.match(src,/function archiveGestionRejected\(/);
  assert.match(src,/CVISADOS_WORKFLOW\.archiveRejected/);
  assert.match(src,/function openGestionResolution\(/);
});

test('Resoluciones only concludes and Gestión owns definitive archive without subsanation',()=>{
  const app=read('js/app.js'), gestion=read('js/exporters.js');
  assert.match(app,/CVISADOS_WORKFLOW\.concludeResolution/);
  assert.doesNotMatch((app.match(/function finalizeCase\(\)[\s\S]*?function reopenCase/)||[''])[0],/archiveRejected/);
  assert.match(gestion,/CVISADOS_WORKFLOW\.archiveRejected/);
  assert.match(gestion,/Archivar sin subsanar/);
});

test('Trámites KPI replaces Finalizados with Pendientes de revisión',()=>{
  const src=read('js/app.js');
  assert.match(src,/Pendientes de revisión/);
  assert.doesNotMatch(src,/\['Finalizados',final\]/);
});

test('service worker caches workflow helper',()=>{
  assert.match(read('sw.js'),/js\/workflow\.js/);
});


test('silent Calificación save cannot stamp a qualification date before the single finalizing action',()=>{
  const src=read('js/exporters.js');
  const block=(src.match(/if\(module==='calificacion'\)\{[^}]*\}/)||[''])[0];
  assert.match(block,/calificacionEncargado/);
  assert.doesNotMatch(block,/fechaCalificacion|updateDecision|report\.fecha/);
});

test('duplicate-case merge delegates workflow history preservation to the workflow helper',()=>{
  const src=read('js/app.js');
  assert.match(src,/workflowScore[\s\S]*?calificacionFinalizada/);
  assert.match(src,/mergeCaseRecords[\s\S]*?CVISADOS_WORKFLOW\.mergeWorkflowHistory\(primary,other\)/);
});

test('Resoluciones and Gestión use separate view predicates',()=>{
  const app=read('js/app.js'), exporters=read('js/exporters.js');
  assert.match(app,/function renderCloseSelect\(\)[\s\S]*?isResolutionCase/);
  assert.match(exporters,/function gestionCases\(\)\{return expedientes\.filter\(CVISADOS_WORKFLOW\.isGestionCase\)\}/);
});

test('concluding a resolution sends it to Gestión without archiving a rejected case',()=>{
  const app=read('js/app.js');
  const block=(app.match(/function finalizeCase\(\)[\s\S]*?function reopenCase/)||[''])[0];
  assert.match(block,/CVISADOS_WORKFLOW\.concludeResolution/);
  assert.doesNotMatch(block,/archiveRejected/);
  assert.match(block,/Concluir resolución/);
});
