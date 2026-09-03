(()=>{
'use strict';
if(!window.cvisadosDesktop)return;
const $=id=>document.getElementById(id);
let lastCheck=null;
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function setStatus(message,kind='info'){
  const el=$('desktopUpdateStatus'); if(!el)return;
  el.className=`desktop-update-status ${kind}`; el.textContent=message||'';
}
function openDialog(){const d=$('desktopUpdateDialog');if(!d)return;if(typeof d.showModal==='function'){if(!d.open)d.showModal();}else d.setAttribute('open','');refreshConfig();}
async function refreshConfig(){
  const cfg=await window.cvisadosDesktop.getUpdateConfig();
  $('desktopRepoUrl').value=cfg.repoUrl||'';
  if(!cfg.repoUrl)setStatus('Pegue el enlace del repositorio público de GitHub. Al compilar desde GitHub Actions se configura automáticamente.','warn');
}
async function saveConfig(){
  try{const cfg=await window.cvisadosDesktop.configureUpdates($('desktopRepoUrl').value);$('desktopRepoUrl').value=cfg.repoUrl;setStatus('Repositorio guardado. Las comprobaciones automáticas quedan habilitadas.','ok');}
  catch(err){setStatus(err.message||String(err),'error');}
}
async function check(){
  const btn=$('desktopCheckUpdate'); if(btn)btn.disabled=true;
  try{
    const r=await window.cvisadosDesktop.checkForUpdates(); lastCheck=r;
    if(r.available){setStatus(`Nueva versión ${r.latestVersion} disponible en GitHub.`,'ok');$('desktopDownloadUpdate').disabled=false;}
    else if(r.configured){setStatus(`Versión ${r.currentVersion}: C-VISADOS está actualizado.`,'ok');$('desktopDownloadUpdate').disabled=true;}
    else setStatus(r.message,'warn');
  }catch(err){setStatus(`No se pudo consultar GitHub: ${err.message||err}`,'error');}
  finally{if(btn)btn.disabled=false;}
}
async function download(){
  const btn=$('desktopDownloadUpdate'); if(btn)btn.disabled=true;
  try{await window.cvisadosDesktop.downloadUpdate();setStatus('Actualización descargada. Pulse “Instalar actualización”.','ok');$('desktopInstallUpdate').disabled=false;}
  catch(err){setStatus(err.message||String(err),'error');if(btn)btn.disabled=false;}
}
async function install(){
  try{setStatus('Abriendo el instalador gráfico de C-VISADOS…','info');await window.cvisadosDesktop.installUpdate();}
  catch(err){setStatus(err.message||String(err),'error');}
}
window.cvisadosDesktop.onUpdateStatus(payload=>{
  if(!payload)return;
  const kind=payload.type==='error'?'error':payload.type==='available'||payload.type==='downloaded'?'ok':payload.type==='not-configured'?'warn':'info';
  setStatus(payload.message,kind);
  if(payload.type==='available')$('desktopDownloadUpdate').disabled=false;
  if(payload.type==='downloaded')$('desktopInstallUpdate').disabled=false;
});
window.addEventListener('DOMContentLoaded',async()=>{
  document.body.classList.add('desktop-mode');
  const info=await window.cvisadosDesktop.getInfo();
  const btn=$('installBtn'); if(btn){btn.textContent='Actualizaciones';btn.disabled=false;btn.title=`C-VISADOS Desktop ${info.version}`;btn.onclick=openDialog;}
  $('desktopSaveRepo')?.addEventListener('click',saveConfig);
  $('desktopCheckUpdate')?.addEventListener('click',check);
  $('desktopDownloadUpdate')?.addEventListener('click',download);
  $('desktopInstallUpdate')?.addEventListener('click',install);
  await refreshConfig();
});
window.CVISADOS_DESKTOP_UI={openDialog,check,saveConfig};
})();
