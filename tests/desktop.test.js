'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

test('desktop package builds an NSIS installer without browser or CMD prerequisites',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.version,'4.0.0');
  assert.equal(pkg.main,'desktop/main.cjs');
  assert.ok(pkg.build?.win?.target?.some?.(x=>(typeof x==='string'?x:x.target)==='nsis'));
  assert.match(pkg.build?.artifactName||'',/C-VISADOS-Setup/);
});

test('desktop main starts the existing app internally and never shells out to an external browser',()=>{
  const main=read('desktop/main.cjs');
  assert.match(main,/BrowserWindow/);
  assert.match(main,/createServer/);
  assert.match(main,/127\.0\.0\.1/);
  assert.doesNotMatch(main,/shell\.openExternal\s*\(/);
  assert.doesNotMatch(main,/cmd\.exe|powershell/i);
});

test('desktop preload exposes update controls through a constrained bridge',()=>{
  const preload=read('desktop/preload.cjs');
  assert.match(preload,/contextBridge\.exposeInMainWorld\(['"]cvisadosDesktop['"]/);
  assert.match(preload,/updates:check/);
  assert.match(preload,/updates:install/);
  assert.match(preload,/updates:configure/);
});

test('GitHub update configuration accepts only public github.com repository URLs',()=>{
  const updater=require('../desktop/update-config.cjs');
  assert.deepEqual(updater.parseGitHubRepoUrl('https://github.com/municipalidad/c-visados'),{owner:'municipalidad',repo:'c-visados'});
  assert.deepEqual(updater.parseGitHubRepoUrl('https://github.com/municipalidad/c-visados.git'),{owner:'municipalidad',repo:'c-visados'});
  assert.equal(updater.parseGitHubRepoUrl('https://gitlab.com/municipalidad/c-visados'),null);
  assert.equal(updater.parseGitHubRepoUrl('file:///c-visados'),null);
});

test('desktop renderer provides GUI update configuration and manual update checks',()=>{
  const html=read('index.html');
  const desktop=read('js/desktop.js');
  assert.match(html,/desktopUpdateDialog/);
  assert.match(html,/Buscar actualizaciones/);
  assert.match(desktop,/cvisadosDesktop\.checkForUpdates/);
  assert.match(desktop,/cvisadosDesktop\.configureUpdates/);
  assert.doesNotMatch(desktop,/cmd\.exe|powershell/i);
});

test('desktop disables PWA installation workflow and service worker registration',()=>{
  const pwa=read('js/pwa.js');
  assert.match(pwa,/window\.cvisadosDesktop/);
  assert.match(pwa,/Actualizaciones/);
});

test('desktop OCR/PDF reader prefers packaged local libraries instead of browser CDN dependencies',()=>{
  const pkg=JSON.parse(read('package.json'));
  const reader=read('js/reader.js');
  assert.equal(pkg.dependencies?.['tesseract.js'],'5.1.1');
  assert.equal(pkg.dependencies?.['pdfjs-dist'],'3.11.174');
  assert.match(reader,/node_modules\/tesseract\.js\/dist\/tesseract\.min\.js/);
  assert.match(reader,/node_modules\/pdfjs-dist\/build\/pdf\.min\.js/);
  assert.match(reader,/window\.cvisadosDesktop|root\.cvisadosDesktop/);
});

test('GitHub updater compares semantic versions and selects the Windows setup release asset',async()=>{
  const os=require('node:os');
  const {compareVersions}=require('../desktop/update-config.cjs');
  const {createUpdateService}=require('../desktop/updater.cjs');
  assert.ok(compareVersions('4.0.1','4.0.0')>0);
  assert.ok(compareVersions('4.0.0','4.0.0')===0);
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cvisados-updater-'));
  fs.mkdirSync(path.join(tmp,'desktop'),{recursive:true});
  fs.writeFileSync(path.join(tmp,'desktop','release-channel.json'),JSON.stringify({owner:'municipio',repo:'c-visados'}));
  const app={getPath:()=>tmp,getVersion:()=> '4.0.0',quit:()=>{}};
  const net={fetch:async()=>({ok:true,json:async()=>({tag_name:'v4.0.1',body:'Mejoras',html_url:'https://github.com/municipio/c-visados/releases/tag/v4.0.1',assets:[{name:'C-VISADOS-Setup-4.0.1-x64.exe',browser_download_url:'https://github.com/municipio/c-visados/releases/download/v4.0.1/setup.exe'}]})})};
  const svc=createUpdateService({app,net,shell:{openPath:async()=>''},dialog:{},appRoot:tmp});
  const result=await svc.check();
  assert.equal(result.available,true);
  assert.equal(result.latestVersion,'4.0.1');
  assert.equal(result.assetName,'C-VISADOS-Setup-4.0.1-x64.exe');
  fs.rmSync(tmp,{recursive:true,force:true});
});
