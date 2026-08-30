const { randomUUID } = require("node:crypto");
const {
  stat,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} = require("node:fs/promises");
const path = require("node:path");

const BACKUP_EXTENSION = ".kmb";
const BACKUP_STATE_FILE = "backup-state.json";

function createSuggestedFileName(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `KhayatiManager_Backup_${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(
    date.getMinutes(),
  )}${BACKUP_EXTENSION}`;
}

function ensureKmbExtension(filePath) {
  return path.extname(filePath).toLowerCase() === BACKUP_EXTENSION
    ? filePath
    : `${filePath}${BACKUP_EXTENSION}`;
}

function safeLanguage(value) {
  return value === "fr" ? "fr" : "ar";
}

class BackupManager {
  constructor({
    app,
    dialog,
    shell,
    getMainWindow,
    getBackendBaseUrl,
    getDesktopToken,
    fetchImpl = globalThis.fetch,
    emitRestoreProgress = () => undefined,
  }) {
    this.app = app;
    this.dialog = dialog;
    this.shell = shell;
    this.getMainWindow = getMainWindow;
    this.getBackendBaseUrl = getBackendBaseUrl;
    this.getDesktopToken = getDesktopToken;
    this.fetchImpl = fetchImpl;
    this.emitRestoreProgress = emitRestoreProgress;
    this.backupInProgress = false;
    this.restoreInProgress = false;
    this.lastLocation = null;
    this.restoreCandidate = null;
  }

  async createBackup({ language, locationType = "MANUAL" } = {}) {
    if (this.backupInProgress || this.restoreInProgress) {
      return {
        success: false,
        errorCode: this.restoreInProgress
          ? "RESTORE_IN_PROGRESS"
          : "BACKUP_IN_PROGRESS",
      };
    }

    this.backupInProgress = true;
    const lang = safeLanguage(language);
    const suggestedName = createSuggestedFileName();
    const options = {
      title:
        lang === "ar" ? "حفظ النسخة الاحتياطية" : "Enregistrer la sauvegarde",
      defaultPath: path.join(this.app.getPath("documents"), suggestedName),
      buttonLabel: lang === "ar" ? "حفظ" : "Enregistrer",
      filters: [{ name: "Khayati Manager Backup", extensions: ["kmb"] }],
      properties: ["showOverwriteConfirmation", "createDirectory"],
    };
    try {
      const window = this.getMainWindow();
      const selection = window
        ? await this.dialog.showSaveDialog(window, options)
        : await this.dialog.showSaveDialog(options);
      if (selection.canceled || !selection.filePath) {
        return { success: false, cancelled: true };
      }

      const destinationPath = ensureKmbExtension(selection.filePath);
      const result = await this.postToBackend("create", {
        destinationPath,
        appVersion: this.app.getVersion(),
      });
      const locationId = randomUUID();
      this.lastLocation = { id: locationId, filePath: destinationPath };
      const state = {
        lastBackupAt: result.createdAt,
        lastBackupFileName: result.fileName,
        lastBackupSize: result.size,
        lastBackupLocationType:
          locationType === "EXTERNAL" ? "EXTERNAL" : "MANUAL",
      };
      const statePersisted = await this.writeState(state)
        .then(() => true)
        .catch(() => false);
      return {
        success: true,
        fileName: result.fileName,
        size: result.size,
        createdAt: result.createdAt,
        warnings: result.warnings ?? [],
        locationId,
        locationType: state.lastBackupLocationType,
        statePersisted,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: this.errorCode(error),
      };
    } finally {
      this.backupInProgress = false;
    }
  }

  createExternalBackup(options = {}) {
    return this.createBackup({ ...options, locationType: "EXTERNAL" });
  }

  async getStatus() {
    try {
      const value = JSON.parse(await readFile(this.statePath(), "utf8"));
      const hasBackup =
        typeof value.lastBackupAt !== "string" ||
        typeof value.lastBackupFileName !== "string" ||
        typeof value.lastBackupSize !== "number" ||
        !["MANUAL", "EXTERNAL"].includes(value.lastBackupLocationType)
          ? false
          : true;
      return {
        hasBackup,
        ...(hasBackup
          ? {
              lastBackupAt: value.lastBackupAt,
              lastBackupFileName: value.lastBackupFileName,
              lastBackupSize: value.lastBackupSize,
              lastBackupLocationType: value.lastBackupLocationType,
            }
          : {}),
        lastRestoreAt:
          typeof value.lastRestoreAt === "string"
            ? value.lastRestoreAt
            : undefined,
        restoredBackupFileName:
          typeof value.restoredBackupFileName === "string"
            ? value.restoredBackupFileName
            : undefined,
        restoredBackupCreatedAt:
          typeof value.restoredBackupCreatedAt === "string"
            ? value.restoredBackupCreatedAt
            : undefined,
        restoreNoticePending: value.restoreNoticePending === true,
      };
    } catch {
      return { hasBackup: false };
    }
  }

  async openBackupLocation(locationId) {
    if (
      typeof locationId !== "string" ||
      !this.lastLocation ||
      locationId !== this.lastLocation.id
    ) {
      return { success: false, errorCode: "LOCATION_UNAVAILABLE" };
    }
    try {
      const metadata = await stat(this.lastLocation.filePath);
      if (!metadata.isFile()) {
        return { success: false, errorCode: "LOCATION_UNAVAILABLE" };
      }
      this.shell.showItemInFolder(this.lastLocation.filePath);
      return { success: true };
    } catch {
      return { success: false, errorCode: "LOCATION_UNAVAILABLE" };
    }
  }

  async selectRestoreFile({ language } = {}) {
    if (this.backupInProgress || this.restoreInProgress) {
      return {
        success: false,
        errorCode: this.restoreInProgress
          ? "RESTORE_IN_PROGRESS"
          : "BACKUP_IN_PROGRESS",
      };
    }
    this.restoreCandidate = null;
    const lang = safeLanguage(language);
    const options = {
      title:
        lang === "ar" ? "اختيار نسخة احتياطية" : "Sélectionner une sauvegarde",
      buttonLabel: lang === "ar" ? "اختيار" : "Sélectionner",
      filters: [{ name: "Khayati Manager Backup", extensions: ["kmb"] }],
      properties: ["openFile"],
    };
    const window = this.getMainWindow();
    const selection = window
      ? await this.dialog.showOpenDialog(window, options)
      : await this.dialog.showOpenDialog(options);
    const filePath = selection.filePaths?.[0];
    if (selection.canceled || !filePath) {
      return { success: false, cancelled: true };
    }
    if (path.extname(filePath).toLowerCase() !== BACKUP_EXTENSION) {
      return { success: false, errorCode: "ARCHIVE_INVALID" };
    }

    try {
      const result = await this.postToBackend("inspect", { filePath });
      const metadata = await stat(filePath);
      if (!metadata.isFile() || metadata.size <= 0) {
        return { success: false, errorCode: "ARCHIVE_INVALID" };
      }
      const restoreCandidateId = randomUUID();
      this.restoreCandidate = {
        id: restoreCandidateId,
        filePath,
        size: metadata.size,
        modifiedAt: metadata.mtimeMs,
      };
      return {
        success: true,
        valid: true,
        restoreCandidateId,
        fileName: result.fileName,
        size: result.size,
        createdAt: result.createdAt,
        appVersion: result.appVersion,
        schemaVersion: result.schemaVersion,
        statistics: result.statistics,
        warnings: result.warnings ?? [],
      };
    } catch (error) {
      return { success: false, errorCode: this.errorCode(error) };
    }
  }

  async restoreBackup({ restoreCandidateId, language } = {}) {
    if (this.restoreInProgress || this.backupInProgress) {
      return {
        success: false,
        errorCode: this.restoreInProgress
          ? "RESTORE_IN_PROGRESS"
          : "BACKUP_IN_PROGRESS",
      };
    }
    const candidate = this.restoreCandidate;
    if (
      typeof restoreCandidateId !== "string" ||
      !candidate ||
      candidate.id !== restoreCandidateId
    ) {
      return { success: false, errorCode: "RESTORE_CANDIDATE_INVALID" };
    }

    this.restoreInProgress = true;
    let restoreSucceeded = false;
    const pollingState = { active: true };
    const progressPolling = this.pollRestoreProgress(pollingState);
    try {
      const metadata = await stat(candidate.filePath);
      if (
        !metadata.isFile() ||
        metadata.size !== candidate.size ||
        metadata.mtimeMs !== candidate.modifiedAt
      ) {
        return { success: false, errorCode: "RESTORE_CANDIDATE_CHANGED" };
      }

      const result = await this.postToBackend("restore", {
        filePath: candidate.filePath,
        appVersion: this.app.getVersion(),
      });
      const state = {
        lastRestoreAt: new Date().toISOString(),
        restoredBackupFileName: result.restoredBackupFileName,
        restoredBackupCreatedAt: result.restoredBackupCreatedAt,
        restoreNoticePending: true,
      };
      const statePersisted = await this.writeState(state)
        .then(() => true)
        .catch(() => false);
      this.restoreCandidate = null;
      restoreSucceeded = true;
      this.emitRestoreProgress({ active: false, step: "RESTARTING" });
      this.scheduleApplicationRelaunch();
      return {
        success: true,
        ...result,
        statePersisted,
        willRestart: true,
        language: safeLanguage(language),
      };
    } catch (error) {
      return { success: false, errorCode: this.errorCode(error) };
    } finally {
      pollingState.active = false;
      await progressPolling;
      if (!restoreSucceeded) this.restoreInProgress = false;
    }
  }

  async acknowledgeRestoreNotice() {
    try {
      await this.writeState({ restoreNoticePending: false });
      return { success: true };
    } catch {
      return { success: false, errorCode: "BACKUP_STATE_UNAVAILABLE" };
    }
  }

  isRestoreActive() {
    return this.restoreInProgress;
  }

  async pollRestoreProgress(state) {
    while (state.active) {
      try {
        const progress = await this.getFromBackend("restore-status");
        this.emitRestoreProgress(progress);
      } catch {
        // A short connection gap is expected while Electron prepares to restart.
      }
      if (state.active) {
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
      }
    }
  }

  scheduleApplicationRelaunch() {
    if (
      typeof this.app.relaunch !== "function" ||
      typeof this.app.exit !== "function"
    ) {
      return;
    }
    const timer = setTimeout(() => {
      this.app.relaunch();
      this.app.exit(0);
    }, 1800);
    timer.unref?.();
  }

  async postToBackend(action, body) {
    let response;
    try {
      response = await this.fetchImpl(
        `${this.getBackendBaseUrl()}/desktop-backup/${action}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-khayati-desktop-token": this.getDesktopToken(),
          },
          body: JSON.stringify(body),
        },
      );
    } catch (error) {
      const wrapped = new Error("The local backup service is unavailable.");
      wrapped.code = "BACKEND_UNAVAILABLE";
      wrapped.cause = error;
      throw wrapped;
    }

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      // The status code still provides a safe generic error below.
    }
    if (!response.ok || payload.success !== true) {
      const error = new Error("The backup operation failed.");
      error.code = payload.errorCode || "BACKUP_UNKNOWN";
      throw error;
    }
    return payload;
  }

  async getFromBackend(action) {
    let response;
    try {
      response = await this.fetchImpl(
        `${this.getBackendBaseUrl()}/desktop-backup/${action}`,
        {
          method: "GET",
          headers: {
            "x-khayati-desktop-token": this.getDesktopToken(),
          },
        },
      );
    } catch (error) {
      const wrapped = new Error("The local backup service is unavailable.");
      wrapped.code = "BACKEND_UNAVAILABLE";
      wrapped.cause = error;
      throw wrapped;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success !== true) {
      const error = new Error("The backup operation failed.");
      error.code = payload.errorCode || "BACKUP_UNKNOWN";
      throw error;
    }
    return payload;
  }

  async writeState(state) {
    const statePath = this.statePath();
    await mkdir(path.dirname(statePath), { recursive: true });
    const partialPath = `${statePath}.partial-${randomUUID()}`;
    try {
      const current = await readFile(statePath, "utf8")
        .then((value) => JSON.parse(value))
        .catch(() => ({}));
      const nextState = { ...current, ...state };
      await writeFile(partialPath, `${JSON.stringify(nextState, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });
      await rename(partialPath, statePath);
    } finally {
      await rm(partialPath, { force: true }).catch(() => undefined);
    }
  }

  statePath() {
    return path.join(this.app.getPath("userData"), BACKUP_STATE_FILE);
  }

  errorCode(error) {
    return typeof error?.code === "string" ? error.code : "BACKUP_UNKNOWN";
  }
}

module.exports = {
  BackupManager,
  createSuggestedFileName,
  ensureKmbExtension,
};
