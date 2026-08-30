const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  appVersion: process.versions.electron,
  platform: process.platform,
  isPackaged: process.env.NODE_ENV === "production",
  backend: {
    baseUrl: ipcRenderer.sendSync("backend:get-base-url"),
  },
  windowControls: {
    minimize() {
      return ipcRenderer.invoke("window:minimize");
    },
    toggleMaximize() {
      return ipcRenderer.invoke("window:toggle-maximize");
    },
    close() {
      return ipcRenderer.invoke("window:close");
    },
  },
  updates: {
    checkForUpdates() {
      return ipcRenderer.invoke("updater:check");
    },
    downloadUpdate() {
      return ipcRenderer.invoke("updater:download");
    },
    installUpdate() {
      return ipcRenderer.invoke("updater:install");
    },
    onStatus(callback) {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on("updater:status", listener);
      return () => ipcRenderer.removeListener("updater:status", listener);
    },
    onDownloadProgress(callback) {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on("updater:download-progress", listener);
      return () =>
        ipcRenderer.removeListener("updater:download-progress", listener);
    },
  },
});

contextBridge.exposeInMainWorld("khayatiBackup", {
  createBackup(options) {
    return ipcRenderer.invoke("backup:create", options);
  },
  createExternalBackup(options) {
    return ipcRenderer.invoke("backup:create-external", options);
  },
  getStatus() {
    return ipcRenderer.invoke("backup:get-status");
  },
  openBackupLocation(locationId) {
    return ipcRenderer.invoke("backup:open-location", locationId);
  },
  selectRestoreFile(options) {
    return ipcRenderer.invoke("backup:select-restore-file", options);
  },
  restoreBackup(options) {
    return ipcRenderer.invoke("backup:restore", options);
  },
  acknowledgeRestoreNotice() {
    return ipcRenderer.invoke("backup:acknowledge-restore-notice");
  },
  onRestoreProgress(callback) {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("backup:restore-progress", listener);
    return () =>
      ipcRenderer.removeListener("backup:restore-progress", listener);
  },
});
