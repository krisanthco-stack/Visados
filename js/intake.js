(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CVISADOS_INTAKE=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const METRO_BASE='https://metro.sarapiqui.go.cr/';
  const ASSIGN_SOURCES=new Set(['EXCEL','CSV','PDF','WEB','SCRAPER','OCR','BACKUP_JSON','ZIP-PDF','ZIP-EXCEL','ZIP-CSV']);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const first=(text,patterns)=>{for(const re of patterns){const m=String(text||'').match(re);if(m)return clean(m[1]??m[0])}return''};
  function normalizeMetroLink(value,base=METRO_BASE){
    const raw=clean(value);
    if(!raw)return {id:'',url:''};
    try{const u=new URL(raw);if(/^https?:$/i.test(u.protocol))return {id:'',url:raw}}catch{}
    const id=raw.replace(/^id\s*[:#-]?\s*/i,'').trim();
    if(!id)return {id:'',url:''};
    const root=String(base||METRO_BASE).replace(/\/+$/,'');
    return {id,url:`${root}/id/${encodeURIComponent(id)}`};
  }
  function isAllowedMetroUrl(raw){
    try{const u=new URL(clean(raw));return u.protocol==='https:'&&u.hostname.toLowerCase()==='metro.sarapiqui.go.cr'}catch{return false}
  }
  function normalizeDate(v){
    const s=clean(v);let m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    m=s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    const months={enero:'01',febrero:'02',marzo:'03',abril:'04',mayo:'05',junio:'06',julio:'07',agosto:'08',septiembre:'09',setiembre:'09',octubre:'10',noviembre:'11',diciembre:'12'};
    m=s.toLowerCase().match(/^(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+(?:de|del)\s+(\d{4})$/i);if(m&&months[m[2]])return `${m[3]}-${months[m[2]]}-${m[1].padStart(2,'0')}`;
    return s;
  }
  function extractCaseFields(text){
    const t=String(text||'');
    const tramite=first(t,[
      /(?:n(?:[.º°o]|úm(?:ero)?)?\s*(?:de\s*)?)?tr[aá]mite\s*[:#-]*\s*((?:VMSDC|MS[- ]?VDCT|[A-Z]{2,10})\s*[-\/]?\s*\d{4}\s*[-\/]\s*\d{1,10})/i,
      /\b((?:VMSDC|MS[- ]?VDCT)\s*[-\/]?\s*\d{4}\s*[-\/]\s*\d{1,10})\b/i
    ]);
    const folio=first(t,[
      /(?:folio\s*(?:real)?|matr[ií]cula|finca)\s*[:#-]*\s*((?:\d{1,2}\s*[- ]\s*)?\d{5,10}\s*[- ]\s*\d{3})/i,
      /\b(\d{1,2}\s*[- ]\s*\d{5,10}\s*[- ]\s*\d{3})\b/
    ]);
    const plano=first(t,[
      /(?:plano(?:\s+catastrado)?|n(?:[.º°o]|úm(?:ero)?)?\s+de\s+plano)\s*[:#-]*\s*([A-Z]{1,4}\s*[- ]\s*\d{3,10}\s*[- ]\s*\d{2,4})/i,
      /\b([A-Z]{1,4}-\d{3,10}-\d{2,4})\b/i
    ]);
    const presentacion=first(t,[
      /(?:presentaci[oó]n|asiento)\s*[:#-]*\s*(\d{4}\s*[-\/]\s*\d{3,10}(?:\s*[- ]\s*C)?)/i,
      /\b(\d{4}-\d{3,10}-C)\b/i
    ]);
    const fecha=normalizeDate(first(t,[/(?:fecha(?:\s+de\s+(?:solicitud|ingreso|presentaci[oó]n))?)\s*[:#-]*\s*(\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4})/i,/(?:fecha(?:\s+de\s+(?:solicitud|ingreso|presentaci[oó]n))?)\s*[:#-]*\s*(\d{1,2}\s+de\s+[a-záéíóúñ]+\s+(?:de|del)\s+\d{4})/i]));
    const solicitante=first(t,[/(?:solicitante|gestionante|interesado)\s*[:#-]*\s*([^\n\r|]{3,100})/i]);
    const area=first(t,[/(?:[aá]rea)\s*[:#-]*\s*([0-9.,]+\s*(?:m(?:²|2)|ha))/i]);
    const distrito=first(t,[/(?:distrito)\s*[:#-]*\s*([^\n\r|]{2,80}?)(?=\s+(?:correo|email|e-mail|solicitante|folio|plano|presentaci[oó]n|[aá]rea)\s*[:#-]|$)/i]);
    const correo=first(t,[/(?:correo|email|e-mail)\s*[:#-]*\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i]);
    return {tramite,folio,plano,presentacion,fecha,solicitante,area,distrito,correo};
  }
  function readerAutofillRecord(detected,sourceType=''){
    const d=detected&&typeof detected==='object'?detected:{};
    const type=clean(sourceType).toUpperCase();
    if(type!=='PDF'&&type!=='OCR')return {...d};
    return {solicitante:d.solicitante||'',tramite:d.tramite||'',presentacion:d.presentacion||''};
  }
  function highlightFieldValue(fieldName,text){
    const field=clean(fieldName).toLowerCase(),value=clean(text);
    if(!value)return'';
    if(field==='solicitante')return clean(value.replace(/^solicitante\s*[:#-]*\s*/i,''));
    if(field==='tramite')return extractCaseFields(value).tramite||'';
    if(field==='presentacion')return extractCaseFields(/presentaci[oó]n\s*[:#-]/i.test(value)?value:`Presentación: ${value}`).presentacion||'';
    return'';
  }
  function sourceMayAssignTramite(type){return ASSIGN_SOURCES.has(clean(type).toUpperCase())}
  function isRealTramite(v){const s=clean(v);return !!s&&!/^X\s*:\s*\d+$/i.test(s)}
  function mergeDetectedFields(target,detected,{sourceType=''}={}){
    const out=target&&typeof target==='object'?target:{};const d=detected&&typeof detected==='object'?detected:{};let assignedTramite=false;const conflicts=[];
    const fill=['folio','plano','presentacion','fecha','tomo','asiento','area','solicitante','correo','distrito','lugar'];
    for(const k of fill){const current=clean(out[k]),incoming=clean(d[k]);if(!current&&incoming)out[k]=d[k];else if(current&&incoming&&current.toLowerCase()!==incoming.toLowerCase())conflicts.push({field:k,current:out[k],detected:d[k]})}
    if(sourceMayAssignTramite(sourceType)&&isRealTramite(d.tramite)&&!isRealTramite(out.tramite)){out.tramite=d.tramite;out.tramiteProvisional=false;assignedTramite=true}else if(isRealTramite(out.tramite)&&isRealTramite(d.tramite)&&clean(out.tramite).toLowerCase()!==clean(d.tramite).toLowerCase())conflicts.push({field:'tramite',current:out.tramite,detected:d.tramite});
    if((!out.metroUrl||!clean(out.metroUrl))&&(d.metroUrl||d.metroId)){const metro=normalizeMetroLink(d.metroUrl||d.metroId);out.metroId=d.metroId||metro.id||'';out.metroUrl=metro.url||''}
    return {case:out,assignedTramite,conflicts};
  }
  return {METRO_BASE,normalizeMetroLink,isAllowedMetroUrl,normalizeDate,extractCaseFields,readerAutofillRecord,highlightFieldValue,sourceMayAssignTramite,mergeDetectedFields,isRealTramite};
});
