const {
  app,
  ipcMain,
  BrowserWindow,
  protocol,
  net,
  shell,
  dialog,
  safeStorage,
} = require("electron");
const path = require("node:path");
const {
  createAuthWindow,
  createLogoutWindow,
  goAuthUrl,
  destroyAuthWin,
} = require("./main/auth-process");
const createAppWindow = require("./main/app-process");
const authService = require("./services/auth-service");
const apiService = require("./services/api-service");
const os = require("os");
const settings = require("electron-settings");

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("electron", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("electron");
}

async function showWindow() {
  try {
    await authService.refreshTokens();
    createAppWindow();
  } catch (err) {
    createAuthWindow();
  }
}

async function onValidate() {
  const valid = await authService.validateSession();

  if (!valid) {
    BrowserWindow.getAllWindows().forEach((window) => window.close());
    createLogoutWindow();
    createAuthWindow();
    return false;
  } else {
    return true;
  }
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  // Handle IPC messages from the renderer process.
  ipcMain.handle("auth:get-profile", authService.getProfile);
  ipcMain.on("auth:go-auth-url", async () => {
    await goAuthUrl();
  });
  ipcMain.handle("auth:validate", async () => {
    const valid = await authService.validateSession();

    if (!valid) {
      BrowserWindow.getAllWindows().forEach((window) => window.close());
      createLogoutWindow();
      createAuthWindow();
      return false;
    } else {
      return true;
    }
  });
  ipcMain.handle("api:get-private-data", apiService.getPrivateData);
  ipcMain.on("auth:log-out", () => {
    BrowserWindow.getAllWindows().forEach((window) => window.close());
    createLogoutWindow();
  });
  showWindow();
});

app.on("open-url", (event, url) => {
  // dialog.showErrorBox('Welcome Back', `You arrived from: ${url}`)
  authService.loadTokens(url).then(() => {
    BrowserWindow.getAllWindows().forEach((window) => window.close());
    createAppWindow();
    // destroyAuthWin();
  })
  
});
// Quit when all windows are closed.
app.on("window-all-closed", () => {
  app.quit();
});
