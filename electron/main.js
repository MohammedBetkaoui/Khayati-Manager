const path = require('node:path');
const { app, BrowserWindow, dialog } = require('electron');
const {
  startBackendProcess,
  stopBackendProcess,
  waitForBackend,
  resolveFrontendEntry,
  resolveSplashEntry,
  resolveAppIcon,
} = require('./launcher');
const { configureUpdater } = require('./updater');

let mainWindow = null;
let splashWindow = null;
let backendProcess = null;
let ownsBackendProcess = false;

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
    backgroundColor: '#f5f4f0',
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
    backgroundColor: '#f5f4f0',
    icon,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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
    backendProcess.once('exit', (code) => {
      if (code !== 0 && mainWindow && !mainWindow.isDestroyed()) {
        dialog.showErrorBox(
          'Khayati Manager',
          `Le backend s'est arrêté de façon inattendue (code ${code ?? 'unknown'}).`,
        );
        app.quit();
      }
    });
  }

  await waitForBackend();

  mainWindow = createMainWindow();
  const autoUpdater = configureUpdater(mainWindow);

  mainWindow.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
    showFatalStartupError(
      new Error(`Impossible de charger l'interface: ${errorDescription} (${errorCode})`),
    );
    app.quit();
  });

  mainWindow.webContents.once('did-finish-load', () => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify().catch((error) => {
        mainWindow?.webContents.send('updater:status', {
          state: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (app.isPackaged) {
    await mainWindow.loadFile(resolveFrontendEntry());
  } else {
    await mainWindow.loadURL('http://localhost:5173');
  }
}

function showFatalStartupError(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }

  dialog.showErrorBox('Khayati Manager', message);
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

  const { ipcMain } = require('electron');

  ipcMain.handle('window:minimize', () => minimizeMainWindow());
  ipcMain.handle('window:toggle-maximize', () => toggleMainWindowMaximize());
  ipcMain.handle('window:close', () => closeMainWindow());

  app.on('second-instance', () => {
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

app.on('before-quit', () => {
  stopBackendProcess(backendProcess, ownsBackendProcess);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    bootstrap().catch((error) => {
      showFatalStartupError(error);
    });
  }
});