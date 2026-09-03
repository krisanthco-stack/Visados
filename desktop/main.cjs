'use strict';
const path=require('node:path');
const {app,BrowserWindow,ipcMain,dialog,net,shell,Menu}=require('electron');
const {createServer}=require('../server/server.cjs');
const {createUpdateService}=require('./updater.cjs');

const APP_ROOT=path.resolve(__dirname,'..');
const HOST='127.0.0.1';
const PORT=8787;
let mainWindow=null;
let localServer=null;
let updates=null;

app.setName('C-VISADOS');
if(!app.requestSingleInstanceLock())app.quit();
else app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.focus();}});

function sendUpdateStatus(payload){
  if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('updates:status',payload);
}

function startLocalServer(){
  return new Promise((resolve,reject)=>{
    localServer=createServer({root:APP_ROOT});
    localServer.once('error',reject);
    localServer.listen(PORT,HOST,()=>resolve(`http://${HOST}:${PORT}/`));
  });
}

function createWindow(url){
  mainWindow=new BrowserWindow({
    title:'C-VISADOS',width:1440,height:900,minWidth:980,minHeight:680,resizable:true,maximizable:true,
    backgroundColor:'#f4f7f9',show:false,autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}
  });
  Menu.setApplicationMenu(null);
  mainWindow.loadURL(url);
  mainWindow.once('ready-to-show',()=>mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  mainWindow.webContents.on('will-navigate',(event,target)=>{if(!String(target).startsWith(url))event.preventDefault();});
  mainWindow.on('closed',()=>{mainWindow=null;});
}

function registerIpc(){
  ipcMain.handle('desktop:info',()=>({desktop:true,version:app.getVersion(),platform:process.platform,storage:'userData'}));
  ipcMain.handle('updates:config:get',()=>updates.getConfig());
  ipcMain.handle('updates:configure',(_e,repoUrl)=>updates.configure(repoUrl));
  ipcMain.handle('updates:check',()=>updates.check({automatic:false}));
  ipcMain.handle('updates:download',()=>updates.download());
  ipcMain.handle('updates:install',()=>updates.install());
}

app.whenReady().then(async()=>{
  try{
    const url=await startLocalServer();
    createWindow(url);
    updates=createUpdateService({app,net,shell,dialog,appRoot:APP_ROOT,sendStatus:sendUpdateStatus});
    registerIpc();
    mainWindow.webContents.once('did-finish-load',()=>setTimeout(()=>updates.check({automatic:true}).catch(err=>sendUpdateStatus({type:'error',message:err.message,automatic:true})),1400));
  }catch(err){
    dialog.showErrorBox('C-VISADOS no pudo iniciar',`No fue posible iniciar el servicio interno de C-VISADOS.\n\n${err.message}`);
    app.quit();
  }
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{try{localServer?.close()}catch{}});
