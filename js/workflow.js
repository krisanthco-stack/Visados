(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CVISADOS_WORKFLOW=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MANAGED_RESULTS=new Set(['APROBADO','RECHAZADO']);
  const isoDate=iso=>String(iso||'').slice(0,10);
  const clone=v=>JSON.parse(JSON.stringify(v??null));

  function normalizeReason(r,i){
    return {
      id:`DEF-${String(i+1).padStart(3,'0')}`,
      source:String(r?.source||''),
      label:String(r?.label||`Defecto ${i+1}`),
      motivation:String(r?.motivation||r?.detalle||''),
      fund:String(r?.fund||''),
      observation:String(r?.observation||''),
      subsanado:false,
      subsanadoEn:null,
      revisadoPor:''
    };
  }

  function ensureArrays(e){
    e.calificacionHistorial=Array.isArray(e.calificacionHistorial)?e.calificacionHistorial:[];
    e.rechazoHistorico=Array.isArray(e.rechazoHistorico)?e.rechazoHistorico:[];
    e.subsanacion=e.subsanacion&&typeof e.subsanacion==='object'?e.subsanacion:{defectos:[],revisiones:[]};
    e.subsanacion.defectos=Array.isArray(e.subsanacion.defectos)?e.subsanacion.defectos:[];
    e.subsanacion.revisiones=Array.isArray(e.subsanacion.revisiones)?e.subsanacion.revisiones:[];
    e.report=e.report&&typeof e.report==='object'?e.report:{};
  }

  function ensureWorkflow(e,getReasons){
    if(!e||typeof e!=='object')return e;
    ensureArrays(e);
    if(typeof e.calificacionFinalizada!=='boolean'){
      e.calificacionFinalizada=!!(e.finalizado||(
        e.fechaCalificacion&&MANAGED_RESULTS.has(e.dictamen)
      ));
    }
    if(!e.fechaPrimeraCalificacion&&e.fechaCalificacion)e.fechaPrimeraCalificacion=e.fechaCalificacion;
    if(!e.fechaUltimaCalificacion&&e.fechaPrimeraCalificacion)e.fechaUltimaCalificacion=e.fechaPrimeraCalificacion;
    if(typeof e.resolucionConcluida!=='boolean'&&e.calificacionFinalizada&&MANAGED_RESULTS.has(e.dictamen)){
      e.resolucionConcluida=!!e.finalizado;
    }
    if(e.resolucionConcluida===true){
      if(!e.fechaResolucionConcluida&&e.fechaFin)e.fechaResolucionConcluida=String(e.fechaFin).length===10?`${e.fechaFin}T12:00:00.000Z`:e.fechaFin;
      if(!e.gestionFecha)e.gestionFecha=isoDate(e.fechaResolucionConcluida||e.fechaFin||'');
    }

    if(e.calificacionFinalizada&&e.dictamen==='RECHAZADO'&&!e.rechazoHistorico.length){
      const at=e.fechaPrimeraCalificacion||e.fechaCalificacion||new Date().toISOString();
      const reasons=typeof getReasons==='function'?getReasons(e):[];
      const defectos=(reasons||[]).map(normalizeReason);
      e.rechazoHistorico.push({fecha:at,resultado:'RECHAZADO',defectos:clone(defectos)});
      if(!e.subsanacion.defectos.length)e.subsanacion.defectos=clone(defectos);
    }

    if(e.calificacionFinalizada){
      if(e.dictamen==='APROBADO'&&e.finalizado)e.estado='APROBADO - FINALIZADO';
      else if(e.dictamen==='APROBADO'&&!e.finalizado)e.estado='APROBADO - PENDIENTE DE RESOLUCIÓN';
      else if(e.dictamen==='RECHAZADO'&&e.finalizado)e.estado='RECHAZADO - ARCHIVADO';
      else if(e.dictamen==='RECHAZADO')e.estado='RECHAZADO - PENDIENTE DE SUBSANACIÓN / CORRECCIÓN';
    }
    return e;
  }

  function isManagementCase(e){
    return !!e?.calificacionFinalizada&&MANAGED_RESULTS.has(e?.dictamen);
  }

  function isResolutionCase(e){
    return isManagementCase(e)&&e?.resolucionConcluida!==true;
  }

  function isGestionCase(e){
    return isManagementCase(e)&&e?.resolucionConcluida===true;
  }

  function isTramitesCase(e){
    return !!e&&!e.calificacionFinalizada;
  }

  function historyEntry(e,{tipo,resultado,now,reasons,reviewer}){
    return {
      tipo,
      fecha:now,
      resultado,
      encargado:String(reviewer||e.calificacionEncargado||''),
      defectos:clone(reasons||[])
    };
  }

  function finishQualification(e,{decision,reasons=[],now=new Date().toISOString()}={}){
    if(!e||typeof e!=='object')throw new Error('Expediente inválido.');
    if(!MANAGED_RESULTS.has(decision))throw new Error('La calificación continúa pendiente y no puede finalizarse.');
    ensureArrays(e);
    const stamp=String(now);
    const first=!e.fechaPrimeraCalificacion;
    if(first)e.fechaPrimeraCalificacion=stamp;
    e.fechaUltimaCalificacion=stamp;
    if(!e.fechaCalificacion)e.fechaCalificacion=e.fechaPrimeraCalificacion;
    e.calificacionFinalizada=true;
    e.dictamen=decision;
    e.finalizado=false;
    e.resolucionConcluida=false;
    e.fechaResolucionConcluida=null;
    e.gestionFecha='';
    e.archivadoEn=null;
    const defects=(reasons||[]).map(normalizeReason);
    e.calificacionHistorial.push(historyEntry(e,{tipo:first?'CALIFICACIÓN INICIAL':'CALIFICACIÓN',resultado:decision,now:stamp,reasons:defects}));
    if(decision==='RECHAZADO'){
      e.estado='RECHAZADO - PENDIENTE DE SUBSANACIÓN / CORRECCIÓN';
      e.rechazoHistorico.push({fecha:stamp,resultado:'RECHAZADO',defectos:clone(defects)});
      e.subsanacion={defectos:clone(defects),revisiones:Array.isArray(e.subsanacion?.revisiones)?e.subsanacion.revisiones:[]};
    }else{
      e.estado='APROBADO - PENDIENTE DE RESOLUCIÓN';
      e.subsanacion=e.subsanacion||{defectos:[],revisiones:[]};
    }
    if(!e.report.fecha)e.report.fecha=isoDate(stamp);
    return e;
  }

  function concludeResolution(e,{now=new Date().toISOString()}={}){
    ensureWorkflow(e);
    if(!isResolutionCase(e))throw new Error('Solo los trámites en Resoluciones pueden concluirse y enviarse a Gestión.');
    const stamp=String(now);
    e.resolucionConcluida=true;
    e.fechaResolucionConcluida=stamp;
    e.gestionFecha=isoDate(stamp);
    if(e.dictamen==='APROBADO'){
      e.finalizado=true;
      e.estado='APROBADO - FINALIZADO';
      e.fechaFin=isoDate(stamp);
    }else{
      e.finalizado=false;
      e.estado='RECHAZADO - PENDIENTE DE SUBSANACIÓN / CORRECCIÓN';
      delete e.fechaFin;
      e.archivadoEn=null;
    }
    return e;
  }

  function reviewSubsanation(e,{resolvedIds=[],reviewer='',now=new Date().toISOString()}={}){
    ensureWorkflow(e);
    if(e.dictamen!=='RECHAZADO'||!isGestionCase(e))throw new Error('Solo los trámites rechazados cuya resolución ya concluyó en Gestión pueden revisarse por subsanación.');
    if(e.finalizado&&e.estado==='RECHAZADO - ARCHIVADO')throw new Error('El trámite está archivado. Reábralo antes de revisar subsanaciones.');
    const stamp=String(now),selected=new Set((resolvedIds||[]).map(String));
    e.subsanacion.defectos=e.subsanacion.defectos.map(d=>{
      const yes=selected.has(String(d.id));
      if(yes&&!d.subsanado)return {...d,subsanado:true,subsanadoEn:stamp,revisadoPor:String(reviewer||'')};
      if(!yes&&d.subsanado)return {...d,subsanado:false,subsanadoEn:null,revisadoPor:''};
      return d;
    });
    e.fechaUltimaCalificacion=stamp;
    const all=e.subsanacion.defectos.length>0&&e.subsanacion.defectos.every(d=>d.subsanado);
    const review={fecha:stamp,revisor:String(reviewer||''),resultado:all?'APROBADO':'RECHAZADO',defectos:clone(e.subsanacion.defectos)};
    e.subsanacion.revisiones.push(review);
    e.calificacionHistorial.push(historyEntry(e,{tipo:'SUBSANACIÓN',resultado:review.resultado,now:stamp,reasons:e.subsanacion.defectos,reviewer}));
    if(all){
      e.dictamen='APROBADO';
      e.finalizado=true;
      e.estado='APROBADO - FINALIZADO';
      e.fechaFin=isoDate(stamp);
      e.report.fecha=isoDate(stamp);
    }else{
      e.dictamen='RECHAZADO';
      e.finalizado=false;
      e.estado='RECHAZADO - PENDIENTE DE SUBSANACIÓN / CORRECCIÓN';
      delete e.fechaFin;
    }
    return {approved:all,case:e};
  }

  function archiveRejected(e,{now=new Date().toISOString()}={}){
    ensureWorkflow(e);
    if(e.dictamen!=='RECHAZADO'||!isGestionCase(e))throw new Error('Solo un trámite rechazado en Gestión puede archivarse por falta de subsanación.');
    const stamp=String(now);
    e.finalizado=true;
    e.estado='RECHAZADO - ARCHIVADO';
    e.archivadoEn=stamp;
    e.fechaFin=isoDate(stamp);
    e.calificacionHistorial.push(historyEntry(e,{tipo:'ARCHIVO SIN SUBSANACIÓN',resultado:'RECHAZADO',now:stamp,reasons:e.subsanacion?.defectos||[]}));
    return e;
  }

  function reopenResolution(e){
    ensureWorkflow(e);
    if(!e.calificacionFinalizada)return e;
    e.finalizado=false;
    e.resolucionConcluida=false;
    delete e.fechaFin;
    if(e.dictamen==='RECHAZADO'){
      e.archivadoEn=null;
      e.estado='RECHAZADO - PENDIENTE DE SUBSANACIÓN / CORRECCIÓN';
    }else if(e.dictamen==='APROBADO')e.estado='APROBADO - PENDIENTE DE RESOLUCIÓN';
    return e;
  }

  function finalizeApprovedResolution(e,{now=new Date().toISOString()}={}){
    ensureWorkflow(e);
    if(e.dictamen!=='APROBADO'||!e.calificacionFinalizada)throw new Error('Solo un trámite aprobado puede finalizar la resolución.');
    if(e.resolucionConcluida===true)return e;
    return concludeResolution(e,{now});
  }

  function qualificationElapsed(e){
    const a=Date.parse(e?.fechaPrimeraCalificacion||''),b=Date.parse(e?.fechaUltimaCalificacion||e?.fechaPrimeraCalificacion||'');
    if(!Number.isFinite(a)||!Number.isFinite(b)||b<a)return {totalHours:0,days:0,hours:0};
    const totalHours=(b-a)/3600000,days=Math.floor(totalHours/24),hours=Number((totalHours-days*24).toFixed(2));
    return {totalHours:Number(totalHours.toFixed(2)),days,hours};
  }

  function cloneValue(v){return v===undefined?undefined:JSON.parse(JSON.stringify(v))}
  function uniqueObjects(items){
    const out=[],seen=new Set();
    for(const item of items||[]){const key=JSON.stringify(item);if(seen.has(key))continue;seen.add(key);out.push(cloneValue(item))}
    return out;
  }
  function timeValue(v){const n=Date.parse(v||'');return Number.isFinite(n)?n:null}
  function earliestDate(values){let found=values.filter(Boolean).map(v=>[v,timeValue(v)]).filter(x=>x[1]!==null).sort((a,b)=>a[1]-b[1]);return found[0]?.[0]||values.find(Boolean)||null}
  function latestDate(values){let found=values.filter(Boolean).map(v=>[v,timeValue(v)]).filter(x=>x[1]!==null).sort((a,b)=>b[1]-a[1]);return found[0]?.[0]||values.find(Boolean)||null}
  function mergeSubsanacion(a,b){
    if(!a&&!b)return null;
    const left=cloneValue(a||{}),right=cloneValue(b||{}),map=new Map();
    for(const d of [...(left.defectos||[]),...(right.defectos||[])]){
      const id=String(d?.id||d?.label||JSON.stringify(d));
      if(!map.has(id)){map.set(id,cloneValue(d));continue}
      const cur=map.get(id),incoming=cloneValue(d);
      const curTime=timeValue(cur.subsanadoEn),inTime=timeValue(incoming.subsanadoEn);
      const newer=inTime!==null&&(curTime===null||inTime>=curTime)?incoming:cur;
      map.set(id,{...cur,...incoming,subsanado:!!(cur.subsanado||incoming.subsanado),subsanadoEn:latestDate([cur.subsanadoEn,incoming.subsanadoEn]),revisadoPor:newer.revisadoPor||cur.revisadoPor||incoming.revisadoPor||''});
    }
    const ultimo=latestDate([left.ultimaRevision,right.ultimaRevision]);
    const rightIsLatest=timeValue(right.ultimaRevision)!==null&&(timeValue(left.ultimaRevision)===null||timeValue(right.ultimaRevision)>=timeValue(left.ultimaRevision));
    return {...left,...right,defectos:[...map.values()],ultimaRevision:ultimo,ultimoRevisor:(rightIsLatest?right.ultimoRevisor:left.ultimoRevisor)||right.ultimoRevisor||left.ultimoRevisor||''};
  }
  function workflowRank(e){
    if(!e?.calificacionFinalizada)return 0;
    const t=timeValue(e.fechaUltimaCalificacion||e.fechaPrimeraCalificacion)||0;
    return (e.finalizado?2:1)*1e15+t;
  }
  function mergeWorkflowHistory(primary,other){
    if(!primary||!other)return primary;
    ensureWorkflow(primary);ensureWorkflow(other);
    const source=workflowRank(other)>workflowRank(primary)?other:primary;
    primary.calificacionHistorial=uniqueObjects([...(primary.calificacionHistorial||[]),...(other.calificacionHistorial||[])]).sort((a,b)=>(timeValue(a.fecha)||0)-(timeValue(b.fecha)||0));
    primary.rechazoHistorico=uniqueObjects([...(primary.rechazoHistorico||[]),...(other.rechazoHistorico||[])]).sort((a,b)=>(timeValue(a.fecha)||0)-(timeValue(b.fecha)||0));
    primary.subsanacion=mergeSubsanacion(primary.subsanacion,other.subsanacion);
    primary.fechaPrimeraCalificacion=earliestDate([primary.fechaPrimeraCalificacion,primary.fechaCalificacion,other.fechaPrimeraCalificacion,other.fechaCalificacion]);
    primary.fechaUltimaCalificacion=latestDate([primary.fechaUltimaCalificacion,primary.fechaPrimeraCalificacion,other.fechaUltimaCalificacion,other.fechaPrimeraCalificacion]);
    if(source.calificacionFinalizada){
      primary.calificacionFinalizada=true;
      primary.dictamen=source.dictamen;primary.finalizado=!!source.finalizado;primary.estado=source.estado;
      if(source.fechaFin)primary.fechaFin=source.fechaFin;else delete primary.fechaFin;
      if(source.archivadoEn)primary.archivadoEn=source.archivadoEn;else if(primary.dictamen!=='RECHAZADO'||!primary.finalizado)delete primary.archivadoEn;
      if(typeof source.resolucionConcluida==='boolean')primary.resolucionConcluida=source.resolucionConcluida;
      if(source.fechaResolucionConcluida)primary.fechaResolucionConcluida=source.fechaResolucionConcluida;
      if(source.gestionFecha)primary.gestionFecha=source.gestionFecha;
      if(!primary.calificacionEncargado&&source.calificacionEncargado)primary.calificacionEncargado=source.calificacionEncargado;
    }
    if(primary.fechaPrimeraCalificacion&&!primary.fechaCalificacion)primary.fechaCalificacion=primary.fechaPrimeraCalificacion;
    return primary;
  }

  return {ensureWorkflow,isManagementCase,isResolutionCase,isGestionCase,isTramitesCase,finishQualification,concludeResolution,reviewSubsanation,archiveRejected,reopenResolution,finalizeApprovedResolution,qualificationElapsed,mergeWorkflowHistory};
});
