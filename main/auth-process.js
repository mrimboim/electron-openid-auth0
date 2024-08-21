const { BrowserWindow, shell, app, dialog } = require('electron');
const authService = require('../services/auth-service');
const createAppWindow = require('../main/app-process');
const path = require("path");


let win = null;

function createAuthWindow() {
  destroyAuthWin();

  win = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      enableRemoteModule: true,
      
      // Might need to remove these becuase we will be talking to main 
      enableRemoteModule: false
    }

  });
  // #TODO: here we will load start html file 
  //        then once button is clicked we do shell.External(authURL) (likely ipc handler)

  // win.loadURL("https://www.descope.com/")
  // console.log(authService.getAuthenticationURL())
  win.loadFile('./renderers/login.html');
  win.webContents.openDevTools();
  
  // shell.openExternal(authService.getAuthenticationURL())

  // win.loadURL(authService.getAuthenticationURL());



  // const {session: {webRequest}} = win.webContents;

  // #TODO: you will nee to replace filter and obnbefore request with protocol handler
  //        for protocol://host/callback, in it we do the same 1. loadtokens 2.createappwindow 3.destroyauthwindow
  // const filter = {
  //   urls: [
  //     'http://localhost/callback*'
  //   ]
  // };

  // #start by replacing it with checking if you can print the URL from returned deeplink call to callback
  app.on("open-url", async (event, url) => {
    // dialog.showErrorBox('Welcome Back', `You arrived from: ${url}`)
    await authService.loadTokens(url);
    createAppWindow();
    destroyAuthWin();
    
  });

  win.on('authenticated', () => {
    destroyAuthWin();
  });

  win.on('closed', () => {
    win = null;
  });
}

async function goAuthUrl() {
  try {
    // console.log("IN go auth function")
    const auth_url = await authService.getAuthenticationURL();
    shell.openExternal(auth_url)
  } catch (error) {
    // console.error("Could not open AuthLogin:", error)
  }
}

function destroyAuthWin() {
  if (!win) return;
  win.close();
  win = null;
}

function createLogoutWindow() {
  const logoutWindow = new BrowserWindow({
    show: false,
  });

  // #TODO: might need to be changed to an external as well but might be ok?
  // authService.logout()
  logoutWindow.loadURL(authService.getLogOutUrl());

  logoutWindow.on('ready-to-show', async () => {
    createAuthWindow();
    await authService.logout();
    logoutWindow.close();
  });
}

module.exports = {
  createAuthWindow,
  createLogoutWindow,
  goAuthUrl
};