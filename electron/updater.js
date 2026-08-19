const { ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');

let configured = false;

function configureUpdater(mainWindow) {
  if (configured) {
    return autoUpdater;
  }

  configured = true;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.fullChangelog = false;

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('updater:status', { state: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater:status', { state: 'available', info });
  });

  autoUpdater.on('update-not-available', (info) => {
    mainWindow?.webContents.send('updater:status', { state: 'none', info });
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('updater:download-progress', progress);
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('updater:status', { state: 'downloaded', info });
  });

  autoUpdater.on('error', (error) => {
    mainWindow?.webContents.send('updater:status', {
      state: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  });

  ipcMain.handle('updater:check', async () => {
    try {
      return await autoUpdater.checkForUpdates();
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('updater:download', async () => {
    try {
      const result = await autoUpdater.downloadUpdate();
      return { ok: true, result };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('updater:install', async () => {
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  });

  ipcMain.handle('app:openExternal', async (_event, url) => {
    await shell.openExternal(url);
    return { ok: true };
  });

  return autoUpdater;
}

module.exports = {
  configureUpdater,
};