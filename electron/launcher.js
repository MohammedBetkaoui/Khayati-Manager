const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { app } = require('electron');

const BACKEND_PORT = 3000;
const FRONTEND_DEV_URL = 'http://localhost:5173';
const BACKEND_BASE_URL = `http://127.0.0.1:${BACKEND_PORT}`;

function resolveWorkspaceRoot() {
  return app.getAppPath();
}

function resolveFrontendEntry() {
  return path.join(resolveWorkspaceRoot(), 'frontend', 'dist', 'index.html');
}

function resolveSplashEntry() {
  return path.join(resolveWorkspaceRoot(), 'electron', 'splash.html');
}

function resolveBackendEntry() {
  return path.join(resolveWorkspaceRoot(), 'backend', 'dist', 'main.js');
}

function resolveBackendRoot() {
  return path.join(resolveWorkspaceRoot(), 'backend');
}

function resolveAppIcon() {
  return path.join(resolveWorkspaceRoot(), 'electron', 'assets', 'icon.ico');
}

function requestOnce(url, timeoutMs = 1200) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Timeout while reaching ${url}`));
    });

    request.on('error', reject);
  });
}

async function isBackendRunning() {
  try {
    await requestOnce(`${BACKEND_BASE_URL}/`);
    return true;
  } catch {
    return false;
  }
}

async function waitForBackend(timeoutMs = 60000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isBackendRunning()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`The backend did not respond on ${BACKEND_BASE_URL} within ${timeoutMs}ms.`);
}

async function startBackendProcess() {
  if (await isBackendRunning()) {
    return { process: null, owned: false };
  }

  if (!app.isPackaged) {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const backendProcess = spawn(npmCommand, ['run', 'start:dev', '--prefix', resolveBackendRoot()], {
      env: {
        ...process.env,
        PORT: String(BACKEND_PORT),
        NODE_ENV: 'development',
      },
      cwd: resolveWorkspaceRoot(),
      stdio: 'inherit',
      windowsHide: true,
    });

    backendProcess.on('exit', (code) => {
      if (code && code !== 0) {
        console.error(`Backend exited with code ${code}`);
      }
    });

    return { process: backendProcess, owned: true };
  }

  try {
    process.env.PORT = String(BACKEND_PORT);
    process.env.NODE_ENV = 'production';
    require(resolveBackendEntry());
  } catch (error) {
    throw new Error(
      `Impossible de démarrer le backend intégré: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return { process: null, owned: true };
}

function stopBackendProcess(backendProcess, owned) {
  if (!backendProcess || !owned) {
    return;
  }

  if (!backendProcess.killed) {
    backendProcess.kill();
  }
}

module.exports = {
  FRONTEND_DEV_URL,
  resolveAppIcon,
  resolveBackendEntry,
  resolveBackendRoot,
  resolveFrontendEntry,
  resolveSplashEntry,
  startBackendProcess,
  stopBackendProcess,
  waitForBackend,
};