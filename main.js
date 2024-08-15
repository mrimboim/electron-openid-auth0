const { app, ipcMain, BrowserWindow, protocol, net, shell, dialog} = require('electron');
const path = require('node:path')
const { createAuthWindow, createLogoutWindow, goAuthUrl } = require('./main/auth-process');
const createAppWindow = require('./main/app-process');
const authService = require('./services/auth-service');
const apiService = require('./services/api-service');
const keytar = require('keytar');
const os = require('os');


if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('electron', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('electron')
}


async function showWindow() {
  try {
    await authService.refreshTokens();
    createAppWindow();
  } catch (err) {
    createAuthWindow();
  }
}

async function testKeytar() {
  const keytarService = 'electron-openid-oauth';
  const keytarAccount = os.userInfo().username;

  try {
      await keytar.setPassword(keytarService, keytarAccount, "lol");
    } catch (error) {
      console.error('FAILED KEYTAR IN MAIN:', error);
    }
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Handle IPC messages from the renderer process.
  ipcMain.handle('auth:get-profile', authService.getProfile);
  ipcMain.on('auth:go-auth-url', () => {
    goAuthUrl();
  });
  ipcMain.handle('api:get-private-data', apiService.getPrivateData);
  ipcMain.on('auth:log-out', () => {
    BrowserWindow.getAllWindows().forEach(window => window.close());
    createLogoutWindow();
  });
  testKeytar();
  showWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  app.quit();
});