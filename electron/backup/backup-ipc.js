const { BackupManager } = require("./backup-manager");

function registerBackupIpc({
  app,
  dialog,
  shell,
  ipcMain,
  getMainWindow,
  getBackendBaseUrl,
  getDesktopToken,
  fetchImpl,
}) {
  const manager = new BackupManager({
    app,
    dialog,
    shell,
    getMainWindow,
    getBackendBaseUrl,
    getDesktopToken,
    fetchImpl,
    emitRestoreProgress(payload) {
      const window = getMainWindow();
      if (window && !window.isDestroyed()) {
        window.webContents.send("backup:restore-progress", payload);
      }
    },
  });

  ipcMain.handle("backup:create", (_event, options) =>
    manager.createBackup(options),
  );
  ipcMain.handle("backup:create-external", (_event, options) =>
    manager.createExternalBackup(options),
  );
  ipcMain.handle("backup:get-status", () => manager.getStatus());
  ipcMain.handle("backup:open-location", (_event, locationId) =>
    manager.openBackupLocation(locationId),
  );
  ipcMain.handle("backup:select-restore-file", (_event, options) =>
    manager.selectRestoreFile(options),
  );
  ipcMain.handle("backup:restore", (_event, options) =>
    manager.restoreBackup(options),
  );
  ipcMain.handle("backup:acknowledge-restore-notice", () =>
    manager.acknowledgeRestoreNotice(),
  );

  return manager;
}

module.exports = { registerBackupIpc };
