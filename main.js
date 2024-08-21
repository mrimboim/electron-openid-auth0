const { app, ipcMain, BrowserWindow, protocol, net, shell, dialog,safeStorage} = require('electron');
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Handle IPC messages from the renderer process.
  (() => {console.log("\n IS ENCRYPTION AVAILABLE:", safeStorage.isEncryptionAvailable())})();
  (async () => {

    encrypted_Refresh = safeStorage.encryptString('AppleSnappleMapple')

    try {
      await settings.set('DSR', encrypted_Refresh);
    } catch (error) {
      console.log(`\nError from setRefresh:${error}\n`)
    }
  });
  //   const keytarService = 'electron-openid-oauth';
  //   const keytarAccount = os.userInfo().username;

  //   try {
  //     await keytar.setPassword(keytarService, keytarAccount, "lol");
  //   } catch (error) {
  //     console.log('\n Failed to save token(MAIN):', error);
  //   }

  //   try {
  //     const test = await keytar.getPassword(keytarService, keytarAccount);
  //     console.log(`Test from keytar value: ${test}`);
  //   } catch (error) {
  //     console.log('\nFailed to get saved keychain token(MAIN):', error);
  //   }
  // })();

  ipcMain.handle('auth:get-profile', authService.getProfile);
  ipcMain.on('auth:go-auth-url', async () => {
    await goAuthUrl();
  });
  ipcMain.on('auth:validate', async () => {
    const valid = await authService.validateSession();
    if (!valid) {
      BrowserWindow.getAllWindows().forEach(window => window.close());
      createLogoutWindow();
      createAuthWindow();
    }
  })
  ipcMain.handle('api:get-private-data', apiService.getPrivateData);
  ipcMain.on('auth:log-out', () => {
    BrowserWindow.getAllWindows().forEach(window => window.close());
    createLogoutWindow();
  });
  showWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  app.quit();
});