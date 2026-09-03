'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('cvisadosDesktop',{
  getInfo:()=>ipcRenderer.invoke('desktop:info'),
  getUpdateConfig:()=>ipcRenderer.invoke('updates:config:get'),
  configureUpdates:repoUrl=>ipcRenderer.invoke('updates:configure',repoUrl),
  checkForUpdates:()=>ipcRenderer.invoke('updates:check'),
  downloadUpdate:()=>ipcRenderer.invoke('updates:download'),
  installUpdate:()=>ipcRenderer.invoke('updates:install'),
  onUpdateStatus:callback=>{
    if(typeof callback!=='function')return()=>{};
    const listener=(_event,payload)=>callback(payload);
    ipcRenderer.on('updates:status',listener);
    return()=>ipcRenderer.removeListener('updates:status',listener);
  }
});
