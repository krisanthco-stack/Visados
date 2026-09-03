'use strict';
const fs=require('node:fs');
const path=require('node:path');
const raw=String(process.env.GITHUB_REPOSITORY||'').trim();
const [owner,repo]=raw.split('/');
if(!owner||!repo){console.log('GITHUB_REPOSITORY no definido; se conserva configuración manual.');process.exit(0)}
const file=path.resolve(__dirname,'..','desktop','release-channel.json');
fs.writeFileSync(file,JSON.stringify({owner,repo},null,2)+'\n');
console.log(`Canal GitHub configurado: https://github.com/${owner}/${repo}`);
