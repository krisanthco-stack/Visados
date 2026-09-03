(() => {
'use strict';

const PWA_VERSION = '4.0.0';
const CACHE_PREFIX = 'c-visados-';
const $id = id => document.getElementById(id);

if(window.cvisadosDesktop){
  window.addEventListener('load',()=>{
    const btn=$id('installBtn');
    if(btn){btn.textContent='Actualizaciones';btn.disabled=false;btn.title='Buscar actualizaciones de C-VISADOS Desktop';}
  });
  window.CVISADOS_PWA={version:PWA_VERSION,desktop:true,status:()=>({desktop:true,serviceWorkerReady:false})};
  return;
}

let deferredPrompt = window.__CV_INSTALL_PROMPT__ || null;
let registration = null;
let swReady = false;
let lastError = '';

function standalone(){
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

function secureContextOk(){
  return location.protocol === 'https:' ||
         location.hostname === 'localhost' ||
         location.hostname === '127.0.0.1';
}

function browserName(){
  const ua = navigator.userAgent || '';
  if(/Edg\//.test(ua)) return 'Microsoft Edge';
  if(/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Google Chrome';
  if(/Firefox\//.test(ua)) return 'Firefox';
  if(/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  return 'Navegador';
}

function ensureDialog(){
  let d = $id('cvInstallDialog');
  if(d) return d;
  d = document.createElement('dialog');
  d.id = 'cvInstallDialog';
  d.className = 'cv-install-dialog';
  d.innerHTML = `
    <form method="dialog" class="cv-install-panel">
      <div class="cv-install-head">
        <strong>Instalación de C-VISADOS</strong>
        <button value="cancel" class="cv-install-x" aria-label="Cerrar">×</button>
      </div>
      <div id="cvInstallStatus" class="cv-install-status"></div>
      <div class="cv-install-actions">
        <button type="button" class="btn primary" id="cvInstallNow">Instalar C-VISADOS</button>
        <button type="button" class="btn" id="cvRepairPwa">Reparar y recargar</button>
        <button value="cancel" class="btn">Cerrar</button>
      </div>
      <div class="small cv-install-help">
        “Reparar y recargar” elimina únicamente cachés y Service Workers de C‑VISADOS.
        No borra los expedientes guardados en el navegador.
      </div>
    </form>`;
  document.body.appendChild(d);

  $id('cvInstallNow').addEventListener('click', installNow);
  $id('cvRepairPwa').addEventListener('click', repairAndReload);
  return d;
}

function statusHtml(){
  const https = secureContextOk();
  const manifest = !!document.querySelector('link[rel="manifest"]');
  const swSupported = 'serviceWorker' in navigator;
  const promptReady = !!deferredPrompt;
  const installed = standalone();

  const row = (ok, label, detail='') =>
    `<div class="cv-check ${ok ? 'ok' : 'bad'}">
      <span>${ok ? '✓' : '!'}</span>
      <div><b>${label}</b>${detail ? `<small>${detail}</small>` : ''}</div>
    </div>`;

  let html = '';
  html += row(https, 'Conexión segura', https ? location.origin : 'La instalación PWA requiere HTTPS.');
  html += row(manifest, 'Manifiesto enlazado', manifest ? 'manifest.webmanifest detectado.' : 'No se encontró el manifiesto.');
  html += row(swSupported && swReady, 'Service Worker', swReady ? 'Activo y listo.' : (swSupported ? 'Todavía no está listo.' : 'No soportado por este navegador.'));
  html += row(installed || promptReady, installed ? 'Aplicación instalada' : 'Instalación disponible',
              installed ? 'C‑VISADOS ya se ejecuta como aplicación.' :
              promptReady ? 'El navegador entregó el diálogo de instalación.' :
              `${browserName()} todavía no entregó el evento de instalación.`);

  if(lastError){
    html += `<div class="cv-install-error"><b>Detalle técnico:</b> ${escapeHtml(lastError)}</div>`;
  }

  if(!installed && !promptReady){
    html += `<div class="cv-install-note">
      Si HTTPS, manifiesto y Service Worker aparecen correctos pero el navegador aún no habilita
      “Instalar”, pulse <b>Reparar y recargar</b>. Después de recargar, espere unos segundos.
      También puede revisar el icono de instalación de ${browserName()} en la barra de direcciones.
    </div>`;
  }
  return html;
}

function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function renderButton(){
  const btn = $id('installBtn');
  if(!btn) return;

  if(standalone()){
    btn.textContent = 'C-VISADOS instalado';
    btn.disabled = true;
    btn.title = 'La aplicación ya está instalada';
    return;
  }

  btn.disabled = false;
  if(deferredPrompt){
    btn.textContent = 'Instalar C-VISADOS';
    btn.title = 'Abrir el diálogo de instalación';
  } else if(!swReady){
    btn.textContent = 'Preparando instalación…';
    btn.title = 'Preparando Service Worker y manifiesto';
  } else {
    btn.textContent = 'Revisar instalación';
    btn.title = 'Ver estado y reparar instalación';
  }
}

async function installNow(){
  if(standalone()){
    renderButton();
    return;
  }
  if(!deferredPrompt){
    showDiagnostics();
    return;
  }

  const ev = deferredPrompt;
  deferredPrompt = null;
  window.__CV_INSTALL_PROMPT__ = null;
  renderButton();

  try{
    await ev.prompt();
    const choice = await ev.userChoice;
    if(choice && choice.outcome === 'dismissed'){
      lastError = 'El diálogo de instalación fue cancelado.';
    }
  }catch(err){
    lastError = err && err.message ? err.message : String(err);
  }
  renderButton();
  refreshDialog();
}

function showDiagnostics(){
  const d = ensureDialog();
  refreshDialog();
  if(typeof d.showModal === 'function'){
    if(!d.open) d.showModal();
  }else{
    d.setAttribute('open','');
  }
}

function refreshDialog(){
  const status = $id('cvInstallStatus');
  if(status) status.innerHTML = statusHtml();
  const install = $id('cvInstallNow');
  if(install){
    install.hidden = standalone();
    install.disabled = !deferredPrompt;
    install.textContent = deferredPrompt ? 'Instalar C-VISADOS' : 'Instalación aún no habilitada';
  }
}

async function clearCvCaches(){
  if(!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX)).map(k => caches.delete(k)));
}

async function unregisterCvWorkers(){
  if(!('serviceWorker' in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  const base = new URL('./', location.href).href;
  await Promise.all(regs
    .filter(r => !r.scope || r.scope.startsWith(base) || base.startsWith(r.scope))
    .map(r => r.unregister()));
}

async function repairAndReload(){
  const repair = $id('cvRepairPwa');
  if(repair){
    repair.disabled = true;
    repair.textContent = 'Reparando…';
  }
  try{
    await unregisterCvWorkers();
    await clearCvCaches();
  }catch(err){
    console.warn('No fue posible limpiar completamente PWA:', err);
  }
  const url = new URL(location.href);
  url.searchParams.set('pwa_refresh', Date.now().toString(36));
  location.replace(url.toString());
}

async function registerServiceWorker(){
  if(!('serviceWorker' in navigator)){
    lastError = 'Este navegador no soporta Service Worker.';
    swReady = false;
    renderButton();
    return;
  }
  if(!secureContextOk()){
    lastError = 'La página no está en un contexto seguro HTTPS.';
    swReady = false;
    renderButton();
    return;
  }

  try{
    registration = await navigator.serviceWorker.register('./sw.js?v=' + PWA_VERSION, {
      scope: './',
      updateViaCache: 'none'
    });
    await registration.update().catch(() => {});
    await navigator.serviceWorker.ready;
    swReady = true;
    lastError = '';
  }catch(err){
    swReady = false;
    lastError = err && err.message ? err.message : String(err);
    console.error('Service Worker no registrado:', err);
  }
  renderButton();
  refreshDialog();
}

window.addEventListener('cv-install-ready', () => {
  deferredPrompt = window.__CV_INSTALL_PROMPT__ || deferredPrompt;
  renderButton();
  refreshDialog();
});

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  window.__CV_INSTALL_PROMPT__ = e;
  window.__CV_INSTALL_PROMPT_TIME__ = Date.now();
  renderButton();
  refreshDialog();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  window.__CV_INSTALL_PROMPT__ = null;
  renderButton();
  refreshDialog();
});

window.addEventListener('load', () => {
  const btn = $id('installBtn');
  if(btn){
    btn.onclick = () => deferredPrompt ? installNow() : showDiagnostics();
  }
  deferredPrompt = window.__CV_INSTALL_PROMPT__ || deferredPrompt;
  renderButton();
  registerServiceWorker();
});

window.CVISADOS_PWA = {
  version: PWA_VERSION,
  status: () => ({
    standalone: standalone(),
    secureContext: secureContextOk(),
    serviceWorkerReady: swReady,
    promptReady: !!deferredPrompt,
    registrationScope: registration?.scope || null,
    error: lastError
  }),
  install: installNow,
  repair: repairAndReload,
  diagnostics: showDiagnostics
};
})();