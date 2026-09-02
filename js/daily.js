(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CVISADOS_DAILY=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function dateKey(value){
    if(value===undefined||value===null||value==='')return '';
    const s=String(value).trim();
    const m=s.match(/^(\d{4}-\d{2}-\d{2})/);
    if(m)return m[1];
    const d=new Date(value);if(Number.isNaN(d.getTime()))return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function createdOn(cases,day){const key=dateKey(day);return (Array.isArray(cases)?cases:[]).filter(e=>dateKey(e?.creadoEn||e?.fechaCreacion)===key)}
  function managedOn(cases,day){const key=dateKey(day);return (Array.isArray(cases)?cases:[]).filter(e=>e?.resolucionConcluida===true&&dateKey(e?.fechaResolucionConcluida||e?.gestionFecha)===key)}
  function dailyStats(cases,day){const created=createdOn(cases,day),managed=managedOn(cases,day);return {created:created.length,managed:managed.length,approved:managed.filter(e=>e.dictamen==='APROBADO').length,rejected:managed.filter(e=>e.dictamen==='RECHAZADO').length}}
  return {dateKey,createdOn,managedOn,dailyStats};
});
