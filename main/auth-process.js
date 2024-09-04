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

      enableRemoteModule: false
    }

  });
  
  win.loadFile('./renderers/login.html');
  // win.webContents.openDevTools();
  
  
  // #start by replacing it with checking if you can print the URL from returned deeplink call to callback
  

  win.on('authenticated', () => {
    destroyAuthWin();
  });

  win.on('closed', () => {
    win = null;
  });
}

async function goAuthUrl(flowParam) {
  try {
    // console.log("IN go auth function")
    const auth_url = await authService.getAuthenticationURL(flowParam);
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

    createAuthWindow();
    authService.logout()
    .then()
}

module.exports = {
  createAuthWindow,
  createLogoutWindow,
  goAuthUrl,
  destroyAuthWin,
};