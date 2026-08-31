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
    emitAutoBackupStatus(payload) {
      const window = getMainWindow();
      if (window && !window.isDestroyed()) {
        window.webContents.send("backup:auto-status", payload);
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
  ipcMain.handle("backup:update-auto-settings", (_event, options) =>
    manager.updateAutomaticBackupSettings(options),
  );
  ipcMain.handle("backup:retry-auto", () => manager.retryAutomaticBackup());
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
  ipcMain.handle("backup:acknowledge-external-reminder", () =>
    manager.acknowledgeExternalBackupReminder(),
  );
  ipcMain.handle("backup:open-known-location", (_event, locationId) =>
    manager.openKnownBackupLocation(locationId),
  );
  ipcMain.handle("backup:inspect-known", (_event, options) =>
    manager.inspectKnownBackup(options),
  );
  ipcMain.handle("backup:delete-known", (_event, options) =>
    manager.deleteKnownBackup(options),
  );

  return manager;
}

module.exports = { registerBackupIpc };
