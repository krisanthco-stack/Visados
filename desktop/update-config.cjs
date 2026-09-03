'use strict';
function parseGitHubRepoUrl(raw){
  try{
    const u=new URL(String(raw||'').trim());
    if(u.protocol!=='https:'||u.hostname.toLowerCase()!=='github.com')return null;
    const parts=u.pathname.replace(/^\/+|\/+$/g,'').split('/').filter(Boolean);
    if(parts.length!==2)return null;
    const owner=parts[0].trim();
    const repo=parts[1].replace(/\.git$/i,'').trim();
    if(!/^[A-Za-z0-9_.-]+$/.test(owner)||!/^[A-Za-z0-9_.-]+$/.test(repo))return null;
    return {owner,repo};
  }catch{return null}
}
function repoUrl(config){
  return config?.owner&&config?.repo?`https://github.com/${config.owner}/${config.repo}`:'';
}
function compareVersions(a,b){
  const pa=String(a||'0').replace(/^v/i,'').split('.').map(x=>Number.parseInt(x,10)||0);
  const pb=String(b||'0').replace(/^v/i,'').split('.').map(x=>Number.parseInt(x,10)||0);
  for(let i=0;i<Math.max(pa.length,pb.length);i++){
    const d=(pa[i]||0)-(pb[i]||0); if(d)return d;
  }
  return 0;
}
module.exports={parseGitHubRepoUrl,repoUrl,compareVersions};
