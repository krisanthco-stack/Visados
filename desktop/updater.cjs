'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {parseGitHubRepoUrl,repoUrl,compareVersions}=require('./update-config.cjs');

function createUpdateService({app,net,shell,dialog,appRoot,sendStatus=()=>{}}){
  const userFile=path.join(app.getPath('userData'),'github-update.json');
  const defaultFile=path.join(appRoot,'desktop','release-channel.json');
  let latest=null;
  let downloaded='';
  const readJson=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return {}}};
  const getConfig=()=>{
    const user=readJson(userFile),def=readJson(defaultFile);
    const cfg=user.owner&&user.repo?user:def;
    return {owner:cfg.owner||'',repo:cfg.repo||'',repoUrl:repoUrl(cfg)};
  };
  const configure=raw=>{
    const parsed=parseGitHubRepoUrl(raw);
    if(!parsed)throw new Error('Use un enlace público con formato https://github.com/usuario/repositorio');
    fs.mkdirSync(path.dirname(userFile),{recursive:true});
    fs.writeFileSync(userFile,JSON.stringify(parsed,null,2));
    const cfg={...parsed,repoUrl:repoUrl(parsed)};
    sendStatus({type:'configured',message:'Repositorio de actualizaciones guardado.',config:cfg});
    return cfg;
  };
  const check=async({automatic=false}={})=>{
    const cfg=getConfig();
    if(!cfg.owner||!cfg.repo){
      const result={ok:false,configured:false,automatic,message:'Configure una vez el repositorio público de GitHub para habilitar las actualizaciones.'};
      sendStatus({type:'not-configured',...result});
      return result;
    }
    sendStatus({type:'checking',message:'Buscando actualizaciones en GitHub…',automatic});
    const api=`https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/releases/latest`;
    const response=await net.fetch(api,{headers:{'accept':'application/vnd.github+json','user-agent':`C-VISADOS/${app.getVersion()}`}});
    if(!response.ok)throw new Error(`GitHub respondió HTTP ${response.status}`);
    const release=await response.json();
    const version=String(release.tag_name||release.name||'').replace(/^v/i,'');
    const asset=(release.assets||[]).find(a=>/^C-VISADOS-Setup-.*\.exe$/i.test(a.name||''));
    const available=compareVersions(version,app.getVersion())>0;
    latest=available&&asset?{version,name:asset.name,url:asset.browser_download_url,notes:release.body||'',htmlUrl:release.html_url||''}:null;
    const result={ok:true,configured:true,automatic,currentVersion:app.getVersion(),latestVersion:version||app.getVersion(),available:!!latest,assetName:latest?.name||'',notes:release.body||'',repoUrl:cfg.repoUrl};
    sendStatus({type:latest?'available':'current',message:latest?`Nueva versión ${version} disponible.`:'C-VISADOS está actualizado.',...result});
    return result;
  };
  const download=async()=>{
    if(!latest){const r=await check();if(!r.available)throw new Error('No hay una actualización disponible para descargar.');}
    sendStatus({type:'downloading',message:`Descargando ${latest.name}…`});
    const response=await net.fetch(latest.url,{redirect:'follow',headers:{'user-agent':`C-VISADOS/${app.getVersion()}`}});
    if(!response.ok)throw new Error(`No fue posible descargar el instalador (HTTP ${response.status}).`);
    const dir=path.join(app.getPath('userData'),'updates');
    fs.mkdirSync(dir,{recursive:true});
    downloaded=path.join(dir,path.basename(latest.name));
    const data=Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(downloaded,data);
    sendStatus({type:'downloaded',message:'Actualización descargada. Puede instalarla ahora.',file:path.basename(downloaded)});
    return {ok:true,file:path.basename(downloaded),version:latest.version};
  };
  const install=async()=>{
    if(!downloaded||!fs.existsSync(downloaded))await download();
    const err=await shell.openPath(downloaded);
    if(err)throw new Error(err);
    setTimeout(()=>app.quit(),1000);
    return {ok:true};
  };
  return {getConfig,configure,check,download,install};
}
module.exports={createUpdateService};
