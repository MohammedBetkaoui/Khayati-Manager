const path = require("node:path");
const { spawn } = require("node:child_process");
const { app } = require("electron");
const {
  backendUrl,
  findAvailablePort,
  isKhayatiBackendRunning,
  waitForKhayatiBackend,
} = require("./backend-runtime");

const FRONTEND_DEV_URL = "http://localhost:5173";
const PREFERRED_BACKEND_PORT = 3000;
let backendBaseUrl = backendUrl(PREFERRED_BACKEND_PORT);

function resolveWorkspaceRoot() {
  return app.getAppPath();
}

function resolveFrontendEntry() {
  return path.join(resolveWorkspaceRoot(), "frontend", "dist", "index.html");
}

function resolveSplashEntry() {
  return path.join(resolveWorkspaceRoot(), "electron", "splash.html");
}

function resolveBackendEntry() {
  return path.join(resolveWorkspaceRoot(), "backend", "dist", "main.js");
}

function resolveBackendRoot() {
  return path.join(resolveWorkspaceRoot(), "backend");
}

function resolveAppIcon() {
  return path.join(resolveWorkspaceRoot(), "electron", "assets", "icon.ico");
}

function getBackendBaseUrl() {
  return backendBaseUrl;
}

async function waitForBackend(timeoutMs = 60_000) {
  return waitForKhayatiBackend(backendBaseUrl, timeoutMs);
}

async function startDevelopmentBackend() {
  const preferredUrl = backendUrl(PREFERRED_BACKEND_PORT);
  if (await isKhayatiBackendRunning(preferredUrl)) {
    backendBaseUrl = preferredUrl;
    return { process: null, owned: false, baseUrl: backendBaseUrl };
  }

  const backendPort = await findAvailablePort(PREFERRED_BACKEND_PORT);
  backendBaseUrl = backendUrl(backendPort);
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const backendProcess = spawn(
    npmCommand,
    ["run", "start:dev", "--prefix", resolveBackendRoot()],
    {
      env: {
        ...process.env,
        PORT: String(backendPort),
        NODE_ENV: "development",
      },
      cwd: resolveWorkspaceRoot(),
      stdio: "inherit",
      windowsHide: true,
    },
  );

  backendProcess.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`Backend exited with code ${code}`);
    }
  });

  return { process: backendProcess, owned: true, baseUrl: backendBaseUrl };
}

async function startPackagedBackend() {
  const backendPort = await findAvailablePort(PREFERRED_BACKEND_PORT);
  backendBaseUrl = backendUrl(backendPort);

  process.env.PORT = String(backendPort);
  process.env.NODE_ENV = "production";
  process.env.KHAYATI_DATABASE_PATH = path.join(
    app.getPath("userData"),
    "database",
    "khayati.sqlite",
  );

  try {
    const backendModule = require(resolveBackendEntry());
    if (typeof backendModule.bootstrap !== "function") {
      throw new Error(
        "La fonction d'initialisation du backend est introuvable.",
      );
    }

    await backendModule.bootstrap();
  } catch (error) {
    throw new Error(
      `Impossible de démarrer le backend intégré: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return { process: null, owned: true, baseUrl: backendBaseUrl };
}

async function startBackendProcess() {
  return app.isPackaged ? startPackagedBackend() : startDevelopmentBackend();
}

function stopBackendProcess(backendProcess, owned) {
  if (!backendProcess || !owned) return;
  if (!backendProcess.killed) backendProcess.kill();
}

module.exports = {
  FRONTEND_DEV_URL,
  getBackendBaseUrl,
  resolveAppIcon,
  resolveBackendEntry,
  resolveBackendRoot,
  resolveFrontendEntry,
  resolveSplashEntry,
  startBackendProcess,
  stopBackendProcess,
  waitForBackend,
};
