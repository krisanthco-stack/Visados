'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const files=fs.readdirSync(path.join(root,'tests')).filter(x=>x.endsWith('.test.js')).sort();
let failed=false;
for(const file of files){
  const r=spawnSync(process.execPath,[path.join(root,'tests',file)],{stdio:'inherit'});
  if(r.status!==0) failed=true;
}
process.exit(failed?1:0);
