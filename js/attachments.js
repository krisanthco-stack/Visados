(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CVISADOS_ATTACHMENTS=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const DB='cvisados_files_v1',STORE='attachments';
  function makeKey(caseId,name,createdAt){return `${Number(caseId)||0}|${String(createdAt||'')}|${String(name||'archivo')}`}
  function openDb(){return new Promise((resolve,reject)=>{if(!root||!root.indexedDB)return resolve(null);const req=root.indexedDB.open(DB,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE)){const s=db.createObjectStore(STORE,{keyPath:'key'});s.createIndex('caseId','caseId',{unique:false})}};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  async function put({key,caseId,name,type,blob,createdAt}={}){try{const db=await openDb();if(!db)return false;const stamp=createdAt||new Date().toISOString(),record={key:key||makeKey(caseId,name,stamp),caseId:Number(caseId)||0,name:String(name||'archivo'),type:String(type||blob?.type||'application/octet-stream'),blob,createdAt:stamp};return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(record);tx.oncomplete=()=>resolve(record);tx.onerror=()=>reject(tx.error)})}catch(err){console.warn('[C-VISADOS] No se pudo guardar adjunto local',err);return false}}
  async function get(key){try{const db=await openDb();if(!db)return null;return await new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}catch{return null}}
  async function getForCase(caseId){try{const db=await openDb();if(!db)return [];return await new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).index('caseId').getAll(Number(caseId)||0);r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}catch{return []}}
  return {makeKey,put,get,getForCase};
});
