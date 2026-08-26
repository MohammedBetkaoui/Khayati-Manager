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
