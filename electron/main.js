const path = require("node:path");
const { existsSync } = require("node:fs");
const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const {
  startBackendProcess,
  stopBackendProcess,
  waitForBackend,
  getBackendBaseUrl,
  getDesktopToken,
  resolveFrontendEntry,
  resolveSplashEntry,
  resolveAppIcon,
  FRONTEND_DEV_URL,
} = require("./launcher");
const { configureUpdater, isUpdaterConfigured } = require("./updater");
const { registerBackupIpc } = require("./backup/backup-ipc");

const userDataPathOverride = process.env.KHAYATI_USER_DATA_PATH?.trim();
if (userDataPathOverride) {
  app.setPath("userData", path.resolve(userDataPathOverride));
}

let mainWindow = null;
let splashWindow = null;
let backendProcess = null;
let ownsBackendProcess = false;
let backupManager = null;

function createSplashWindow() {
  return new BrowserWindow({
    width: 520,
    height: 320,
    frame: false,
    resizable: false,
    movable: false,
    show: true,
    transparent: false,
    autoHideMenuBar: true,
    backgroundColor: "#f5f4f0",
    icon: resolveAppIcon(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
}

function createMainWindow() {
  const icon = resolveAppIcon();
  return new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    fullscreenable: false,
    frame: false,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: "#f5f4f0",
    icon,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
}

async function bootstrap() {
  splashWindow = createSplashWindow();
  await splashWindow.loadFile(resolveSplashEntry());

  const backendState = await startBackendProcess();
  backendProcess = backendState.process;
  ownsBackendProcess = backendState.owned;

  if (backendProcess) {
    backendProcess.once("exit", (code) => {
      if (code !== 0 && mainWindow && !mainWindow.isDestroyed()) {
        dialog.showErrorBox(
          "Khayati Manager",
          `Le backend s'est arrêté de façon inattendue (code ${code ?? "unknown"}).`,
        );
        app.quit();
      }
    });
  }

  await waitForBackend();

  mainWindow = createMainWindow();
  const autoUpdater = configureUpdater(mainWindow);

  mainWindow.webContents.once(
    "did-fail-load",
    (_event, errorCode, errorDescription) => {
      showFatalStartupError(
        new Error(
          `Impossible de charger l'interface: ${errorDescription} (${errorCode})`,
        ),
      );
      app.quit();
    },
  );

  mainWindow.webContents.once("did-finish-load", () => {
    if (app.isPackaged && isUpdaterConfigured()) {
      autoUpdater.checkForUpdatesAndNotify().catch((error) => {
        mainWindow?.webContents.send("updater:status", {
          state: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }
  });

  mainWindow.once("ready-to-show", () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow.show();
    const automaticBackupTimer = setTimeout(() => {
      void backupManager?.initializeAutomaticBackup();
    }, 1500);
    automaticBackupTimer.unref?.();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.on("close", (event) => {
    if (backupManager?.isOperationActive()) {
      event.preventDefault();
    }
  });

  await loadFrontend(mainWindow);
}

async function loadFrontend(window) {
  const builtFrontend = resolveFrontendEntry();
  if (app.isPackaged) {
    await window.loadFile(builtFrontend);
    return;
  }

  try {
    const response = await fetch(FRONTEND_DEV_URL, {
      signal: AbortSignal.timeout(1200),
    });
    if (response.ok) {
      await window.loadURL(FRONTEND_DEV_URL);
      return;
    }
  } catch {
    // Running `electron .` directly is supported through the latest Vite build.
  }

  if (!existsSync(builtFrontend)) {
    throw new Error(
      "Interface introuvable. Lancez npm run build:frontend ou npm run desktop:dev.",
    );
  }
  await window.loadFile(builtFrontend);
}

function showFatalStartupError(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }

  dialog.showErrorBox("Khayati Manager", message);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  const getMainWindow = () => mainWindow;

  const toggleMainWindowMaximize = () => {
    const window = getMainWindow();
    if (!window || window.isDestroyed()) {
      return false;
    }

    if (window.isMaximized()) {
      window.unmaximize();
      return false;
    }

    window.maximize();
    return true;
  };

  const minimizeMainWindow = () => {
    const window = getMainWindow();
    if (!window || window.isDestroyed()) {
      return false;
    }

    window.minimize();
    return true;
  };

  const closeMainWindow = () => {
    const window = getMainWindow();
    if (!window || window.isDestroyed()) {
      return false;
    }

    window.close();
    return true;
  };

  ipcMain.on("backend:get-base-url", (event) => {
    event.returnValue = getBackendBaseUrl();
  });

  ipcMain.handle("window:minimize", () => minimizeMainWindow());
  ipcMain.handle("window:toggle-maximize", () => toggleMainWindowMaximize());
  ipcMain.handle("window:close", () => closeMainWindow());

  backupManager = registerBackupIpc({
    app,
    dialog,
    shell,
    ipcMain,
    getMainWindow,
    getBackendBaseUrl,
    getDesktopToken,
  });

  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    bootstrap().catch((error) => {
      showFatalStartupError(error);
      app.quit();
    });
  });
}

app.on("before-quit", () => {
  backupManager?.prepareForShutdown();
  stopBackendProcess(backendProcess, ownsBackendProcess);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    bootstrap().catch((error) => {
      showFatalStartupError(error);
    });
  }
});
