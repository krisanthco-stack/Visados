const test=require('node:test');
const assert=require('node:assert/strict');
const wf=require('../js/workflow.js');

function reasons(){return [
  {source:'Calificación',label:'C-01',motivation:'Defecto uno',fund:'Norma 1'},
  {source:'Inspección',label:'Acceso 1',motivation:'Defecto dos',fund:''}
]}

test('legacy finalized cases migrate into Gestión without returning to Trámites',()=>{
  const e={dictamen:'APROBADO',finalizado:true,estado:'FINALIZADO',fechaCalificacion:'2026-08-01T10:00:00.000Z'};
  wf.ensureWorkflow(e,()=>reasons());
  assert.equal(e.calificacionFinalizada,true);
  assert.equal(wf.isManagementCase(e),true);
  assert.equal(wf.isTramitesCase(e),false);
  assert.equal(e.estado,'APROBADO - FINALIZADO');
});

test('Guardar, finalizar y enviar rejects a pending qualification',()=>{
  const e={dictamen:'PENDIENTE',finalizado:false};
  assert.throws(()=>wf.finishQualification(e,{decision:'PENDIENTE',reasons:[],now:'2026-08-24T12:00:00.000Z'}),/pendiente/i);
  assert.notEqual(e.calificacionFinalizada,true);
});

test('rejected qualification enters Gestión pending subsanation and snapshots defects',()=>{
  const e={dictamen:'RECHAZADO',finalizado:false,report:{},calificacionEncargado:'Analista'};
  wf.finishQualification(e,{decision:'RECHAZADO',reasons:reasons(),now:'2026-08-24T12:00:00.000Z'});
  assert.equal(e.calificacionFinalizada,true);
  assert.equal(e.finalizado,false);
  assert.equal(e.estado,'RECHAZADO - PENDIENTE DE SUBSANACIÓN / CORRECCIÓN');
  assert.equal(e.fechaPrimeraCalificacion,'2026-08-24T12:00:00.000Z');
  assert.equal(e.fechaUltimaCalificacion,'2026-08-24T12:00:00.000Z');
  assert.equal(e.rechazoHistorico.length,1);
  assert.equal(e.rechazoHistorico[0].defectos.length,2);
  assert.equal(e.subsanacion.defectos.length,2);
  assert.ok(e.subsanacion.defectos.every(d=>d.subsanado===false));
});

test('approved qualification enters Resoluciones/Gestión but is not finalized until resolution closes',()=>{
  const e={dictamen:'APROBADO',finalizado:false,report:{}};
  wf.finishQualification(e,{decision:'APROBADO',reasons:[],now:'2026-08-24T12:00:00.000Z'});
  assert.equal(e.calificacionFinalizada,true);
  assert.equal(e.finalizado,false);
  assert.equal(e.estado,'APROBADO - PENDIENTE DE RESOLUCIÓN');
  assert.equal(wf.isManagementCase(e),true);
});

test('partial subsanation preserves rejection and first qualification time',()=>{
  const e={dictamen:'RECHAZADO',finalizado:false,report:{}};
  wf.finishQualification(e,{decision:'RECHAZADO',reasons:reasons(),now:'2026-08-20T10:00:00.000Z'});
  wf.concludeResolution(e,{now:'2026-08-20T10:30:00.000Z'});
  const first=e.fechaPrimeraCalificacion;
  wf.reviewSubsanation(e,{resolvedIds:[e.subsanacion.defectos[0].id],reviewer:'Revisor',now:'2026-08-24T11:00:00.000Z'});
  assert.equal(e.dictamen,'RECHAZADO');
  assert.equal(e.finalizado,false);
  assert.equal(e.estado,'RECHAZADO - PENDIENTE DE SUBSANACIÓN / CORRECCIÓN');
  assert.equal(e.fechaPrimeraCalificacion,first);
  assert.equal(e.fechaUltimaCalificacion,'2026-08-24T11:00:00.000Z');
  assert.equal(e.subsanacion.defectos.filter(d=>d.subsanado).length,1);
  assert.equal(e.calificacionHistorial.at(-1).resultado,'RECHAZADO');
});

test('complete subsanation becomes approved + finalized and keeps rejection history',()=>{
  const e={dictamen:'RECHAZADO',finalizado:false,report:{fecha:'2026-08-20'}};
  wf.finishQualification(e,{decision:'RECHAZADO',reasons:reasons(),now:'2026-08-20T10:00:00.000Z'});
  wf.concludeResolution(e,{now:'2026-08-20T10:30:00.000Z'});
  const ids=e.subsanacion.defectos.map(d=>d.id), rejection=JSON.stringify(e.rechazoHistorico);
  wf.reviewSubsanation(e,{resolvedIds:ids,reviewer:'Revisor',now:'2026-08-24T11:00:00.000Z'});
  assert.equal(e.dictamen,'APROBADO');
  assert.equal(e.finalizado,true);
  assert.equal(e.estado,'APROBADO - FINALIZADO');
  assert.equal(e.fechaPrimeraCalificacion,'2026-08-20T10:00:00.000Z');
  assert.equal(e.fechaUltimaCalificacion,'2026-08-24T11:00:00.000Z');
  assert.equal(e.report.fecha,'2026-08-24');
  assert.equal(JSON.stringify(e.rechazoHistorico),rejection);
  assert.equal(e.calificacionHistorial.at(-1).resultado,'APROBADO');
  assert.equal(e.calificacionHistorial.at(-1).tipo,'SUBSANACIÓN');
});

test('rejected case can be archived only as a definitive close without subsanation',()=>{
  const e={dictamen:'RECHAZADO',finalizado:false,report:{}};
  wf.finishQualification(e,{decision:'RECHAZADO',reasons:reasons(),now:'2026-08-20T10:00:00.000Z'});
  wf.concludeResolution(e,{now:'2026-08-20T10:30:00.000Z'});
  wf.archiveRejected(e,{now:'2026-08-30T09:00:00.000Z'});
  assert.equal(e.dictamen,'RECHAZADO');
  assert.equal(e.finalizado,true);
  assert.equal(e.estado,'RECHAZADO - ARCHIVADO');
  assert.equal(e.archivadoEn,'2026-08-30T09:00:00.000Z');
});

test('Gestión includes only cases whose qualification was finalized and only approved/rejected results',()=>{
  const rows=[
    {id:1,calificacionFinalizada:false,dictamen:'APROBADO'},
    {id:2,calificacionFinalizada:true,dictamen:'APROBADO'},
    {id:3,calificacionFinalizada:true,dictamen:'RECHAZADO'},
    {id:4,calificacionFinalizada:true,dictamen:'PENDIENTE'}
  ];
  assert.deepEqual(rows.filter(wf.isManagementCase).map(x=>x.id),[2,3]);
  assert.deepEqual(rows.filter(wf.isTramitesCase).map(x=>x.id),[1]);
});

test('elapsed qualification time reports from first to last review without resetting',()=>{
  const e={fechaPrimeraCalificacion:'2026-08-20T10:00:00.000Z',fechaUltimaCalificacion:'2026-08-24T11:30:00.000Z'};
  const x=wf.qualificationElapsed(e);
  assert.equal(x.totalHours,97.5);
  assert.equal(x.days,4);
  assert.equal(x.hours,1.5);
});


test('duplicate imports keep the finalized qualification, rejection snapshot and subsanation history',()=>{
  const active={id:1,tramite:'V-1',calificacionFinalizada:false,dictamen:'PENDIENTE',calificacionHistorial:[],rechazoHistorico:[]};
  const managed={id:2,tramite:'V-1',calificacionFinalizada:true,dictamen:'RECHAZADO',finalizado:false,estado:'RECHAZADO - PENDIENTE DE SUBSANACIÓN / CORRECCIÓN',fechaPrimeraCalificacion:'2026-08-20T10:00:00.000Z',fechaUltimaCalificacion:'2026-08-24T11:00:00.000Z',calificacionHistorial:[{tipo:'CALIFICACIÓN FINALIZADA',resultado:'RECHAZADO',fecha:'2026-08-20T10:00:00.000Z'}],rechazoHistorico:[{fecha:'2026-08-20T10:00:00.000Z',defectos:[{id:'D1',label:'Defecto 1'}]}],subsanacion:{defectos:[{id:'D1',label:'Defecto 1',subsanado:true,subsanadoEn:'2026-08-24T11:00:00.000Z'}],ultimoRevisor:'Revisor'}};
  wf.mergeWorkflowHistory(active,managed);
  assert.equal(active.calificacionFinalizada,true);
  assert.equal(active.dictamen,'RECHAZADO');
  assert.equal(active.estado,'RECHAZADO - PENDIENTE DE SUBSANACIÓN / CORRECCIÓN');
  assert.equal(active.fechaPrimeraCalificacion,'2026-08-20T10:00:00.000Z');
  assert.equal(active.fechaUltimaCalificacion,'2026-08-24T11:00:00.000Z');
  assert.equal(active.calificacionHistorial.length,1);
  assert.equal(active.rechazoHistorico.length,1);
  assert.equal(active.subsanacion.defectos[0].subsanado,true);
});

test('finalized qualification is visible in Resoluciones until resolution is concluded',()=>{
  const e={dictamen:'APROBADO',finalizado:false,report:{}};
  wf.finishQualification(e,{decision:'APROBADO',now:'2026-09-02T08:00:00-06:00'});
  assert.equal(wf.isResolutionCase(e),true);
  assert.equal(wf.isGestionCase(e),false);
  assert.notEqual(e.resolucionConcluida,true);
});

test('concluding an approved resolution moves it to Gestión and finalizes it',()=>{
  const e={dictamen:'APROBADO',finalizado:false,report:{}};
  wf.finishQualification(e,{decision:'APROBADO',now:'2026-09-02T08:00:00-06:00'});
  wf.concludeResolution(e,{now:'2026-09-02T10:00:00-06:00'});
  assert.equal(e.resolucionConcluida,true);
  assert.equal(e.gestionFecha,'2026-09-02');
  assert.equal(e.estado,'APROBADO - FINALIZADO');
  assert.equal(wf.isResolutionCase(e),false);
  assert.equal(wf.isGestionCase(e),true);
});

test('concluding a rejected resolution moves it to Gestión without archiving it',()=>{
  const e={dictamen:'RECHAZADO',finalizado:false,report:{}};
  wf.finishQualification(e,{decision:'RECHAZADO',reasons:reasons(),now:'2026-09-02T08:00:00-06:00'});
  wf.concludeResolution(e,{now:'2026-09-02T10:00:00-06:00'});
  assert.equal(e.resolucionConcluida,true);
  assert.equal(e.finalizado,false);
  assert.equal(e.estado,'RECHAZADO - PENDIENTE DE SUBSANACIÓN / CORRECCIÓN');
  assert.equal(wf.isGestionCase(e),true);
});
