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
const DEFAULT_AUTO_RETENTION = 14;
const EXTERNAL_BACKUP_MAX_AGE_DAYS = 14;
const EXTERNAL_REMINDER_INTERVAL_DAYS = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

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
    emitAutoBackupStatus = () => undefined,
  }) {
    this.app = app;
    this.dialog = dialog;
    this.shell = shell;
    this.getMainWindow = getMainWindow;
    this.getBackendBaseUrl = getBackendBaseUrl;
    this.getDesktopToken = getDesktopToken;
    this.fetchImpl = fetchImpl;
    this.emitRestoreProgress = emitRestoreProgress;
    this.emitAutoBackupStatus = emitAutoBackupStatus;
    this.backupInProgress = false;
    this.restoreInProgress = false;
    this.lastLocation = null;
    this.restoreCandidate = null;
    this.knownBackupLocations = new Map();
    this.shuttingDown = false;
    this.stateWriteQueue = Promise.resolve();
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
      if (locationType === "EXTERNAL") {
        state.lastExternalBackupAt = result.createdAt;
      } else {
        state.lastManualBackupAt = result.createdAt;
      }
      const currentState = await this.readState();
      state.backupHistory = this.addHistoryEntry(currentState.backupHistory, {
        fileName: result.fileName,
        size: result.size,
        createdAt: result.createdAt,
        type: state.lastBackupLocationType,
        status: "SUCCESS",
      });
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
      const value = await this.readState();
      const catalog = await this.getFromBackend("catalog").catch(() => ({
        history: [],
        totalSize: 0,
        hasImportantData: false,
      }));
      this.knownBackupLocations.clear();
      const localHistory = (catalog.history ?? []).map((entry) => {
        const locationId = randomUUID();
        this.knownBackupLocations.set(locationId, {
          filePath: entry.filePath,
          type: entry.type,
        });
        return {
          locationId,
          fileName: entry.fileName,
          size: entry.size,
          createdAt: entry.createdAt,
          type: entry.type,
          status: "SUCCESS",
          canOpen: true,
          canRestore: true,
          canDelete: true,
        };
      });
      const history = this.mergeHistory(localHistory, value.backupHistory);
      const lastAuto = localHistory.find((entry) => entry.type === "AUTOMATIC");
      const now = new Date();
      const firstSeenAt = value.backupSystemFirstSeenAt ?? now.toISOString();
      const externalReminderDue = this.externalReminderDue({
        now,
        firstSeenAt,
        lastExternalBackupAt: value.lastExternalBackupAt,
        lastExternalBackupReminderAt: value.lastExternalBackupReminderAt,
        lastRestoreAt: value.lastRestoreAt,
        hasImportantData: catalog.hasImportantData === true,
      });
      const statePatch = {};
      if (!value.backupSystemFirstSeenAt) {
        statePatch.backupSystemFirstSeenAt = firstSeenAt;
      }
      if (externalReminderDue) {
        statePatch.lastExternalBackupReminderAt = now.toISOString();
      }
      if (Object.keys(statePatch).length) {
        await this.writeState(statePatch).catch(() => undefined);
      }
      const hasBackup =
        typeof value.lastBackupAt !== "string" ||
        typeof value.lastBackupFileName !== "string" ||
        typeof value.lastBackupSize !== "number" ||
        !["MANUAL", "EXTERNAL", "AUTOMATIC"].includes(
          value.lastBackupLocationType,
        )
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
        autoBackupEnabled: value.autoBackupEnabled,
        autoBackupRetention: value.autoBackupRetention,
        lastAutoBackupAt: lastAuto?.createdAt ?? value.lastAutoBackupAt,
        lastAutoBackupFileName: lastAuto?.fileName ?? value.lastAutoBackupFileName,
        lastAutoBackupSize: lastAuto?.size ?? value.lastAutoBackupSize,
        lastAutoBackupAttemptAt: value.lastAutoBackupAttemptAt,
        lastAutoBackupStatus: value.lastAutoBackupStatus,
        lastAutoBackupErrorCode: value.lastAutoBackupErrorCode,
        lastManualBackupAt: value.lastManualBackupAt,
        lastExternalBackupAt: value.lastExternalBackupAt,
        externalReminderDue,
        history,
        localBackupTotalSize: catalog.totalSize ?? 0,
      };
    } catch {
      return {
        hasBackup: false,
        autoBackupEnabled: true,
        autoBackupRetention: DEFAULT_AUTO_RETENTION,
        history: [],
        externalReminderDue: false,
      };
    }
  }

  async initializeAutomaticBackup() {
    if (this.shuttingDown || this.backupInProgress || this.restoreInProgress) {
      return { success: false, errorCode: "BACKUP_IN_PROGRESS" };
    }
    const state = await this.readState();
    if (!state.autoBackupEnabled) {
      return { success: true, skipped: true, skippedReason: "DISABLED" };
    }
    return this.runAutomaticBackup(state.autoBackupRetention);
  }

  async retryAutomaticBackup() {
    const state = await this.readState();
    if (!state.autoBackupEnabled) {
      return { success: false, errorCode: "AUTO_BACKUP_DISABLED" };
    }
    return this.runAutomaticBackup(state.autoBackupRetention);
  }

  async updateAutomaticBackupSettings({ enabled, retention } = {}) {
    if (typeof enabled !== "boolean" || ![7, 14, 30].includes(retention)) {
      return { success: false, errorCode: "BACKUP_SETTINGS_INVALID" };
    }
    try {
      await this.writeState({
        autoBackupEnabled: enabled,
        autoBackupRetention: retention,
      });
    } catch {
      return { success: false, errorCode: "BACKUP_STATE_UNAVAILABLE" };
    }
    if (!this.backupInProgress && !this.restoreInProgress) {
      await this.postToBackend("automatic/retention", { retention }).catch(
        () => undefined,
      );
    }
    return { success: true, autoBackupEnabled: enabled, autoBackupRetention: retention };
  }

  async runAutomaticBackup(retention) {
    if (this.shuttingDown || this.backupInProgress || this.restoreInProgress) {
      return {
        success: false,
        errorCode: this.restoreInProgress ? "RESTORE_IN_PROGRESS" : "BACKUP_IN_PROGRESS",
      };
    }
    this.backupInProgress = true;
    const attemptedAt = new Date().toISOString();
    try {
      const result = await this.postToBackend("automatic/run", {
        retention,
        appVersion: this.app.getVersion(),
      });
      const patch = {
        lastAutoBackupAttemptAt: attemptedAt,
        lastAutoBackupStatus: "SUCCESS",
        lastAutoBackupErrorCode: null,
      };
      if (result.createdAt) {
        patch.lastAutoBackupAt = result.createdAt;
        patch.lastAutoBackupFileName = result.fileName;
        patch.lastAutoBackupSize = result.size;
        patch.lastBackupAt = result.createdAt;
        patch.lastBackupFileName = result.fileName;
        patch.lastBackupSize = result.size;
        patch.lastBackupLocationType = "AUTOMATIC";
      }
      await this.writeState(patch).catch(() => undefined);
      const response = { success: true, ...result };
      this.emitAutoBackupStatus(response);
      return response;
    } catch (error) {
      const errorCode = this.errorCode(error);
      await this.writeState({
        lastAutoBackupAttemptAt: attemptedAt,
        lastAutoBackupStatus: "FAILED",
        lastAutoBackupErrorCode: errorCode,
      }).catch(() => undefined);
      const response = { success: false, errorCode };
      this.emitAutoBackupStatus(response);
      return response;
    } finally {
      this.backupInProgress = false;
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

  async openKnownBackupLocation(locationId) {
    const known = this.knownBackupLocations.get(locationId);
    if (!known) return { success: false, errorCode: "LOCATION_UNAVAILABLE" };
    try {
      const metadata = await stat(known.filePath);
      if (!metadata.isFile()) {
        return { success: false, errorCode: "LOCATION_UNAVAILABLE" };
      }
      this.shell.showItemInFolder(known.filePath);
      return { success: true };
    } catch {
      return { success: false, errorCode: "LOCATION_UNAVAILABLE" };
    }
  }

  async inspectKnownBackup({ locationId } = {}) {
    if (this.backupInProgress || this.restoreInProgress) {
      return {
        success: false,
        errorCode: this.restoreInProgress
          ? "RESTORE_IN_PROGRESS"
          : "BACKUP_IN_PROGRESS",
      };
    }
    const known = this.knownBackupLocations.get(locationId);
    if (!known) return { success: false, errorCode: "ARCHIVE_INVALID" };
    try {
      const result = await this.postToBackend("inspect", {
        filePath: known.filePath,
      });
      return await this.rememberRestoreCandidate(known.filePath, result);
    } catch (error) {
      return { success: false, errorCode: this.errorCode(error) };
    }
  }

  async deleteKnownBackup({ locationId } = {}) {
    if (this.backupInProgress || this.restoreInProgress) {
      return {
        success: false,
        errorCode: this.restoreInProgress
          ? "RESTORE_IN_PROGRESS"
          : "BACKUP_IN_PROGRESS",
      };
    }
    const known = this.knownBackupLocations.get(locationId);
    if (!known) return { success: false, errorCode: "ARCHIVE_INVALID" };
    if (this.restoreCandidate?.filePath === known.filePath) {
      return { success: false, errorCode: "BACKUP_IN_USE" };
    }
    try {
      await this.postToBackend("catalog/delete", { filePath: known.filePath });
      this.knownBackupLocations.delete(locationId);
      return { success: true };
    } catch (error) {
      return { success: false, errorCode: this.errorCode(error) };
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
      return await this.rememberRestoreCandidate(filePath, result);
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

  async acknowledgeExternalBackupReminder() {
    try {
      await this.writeState({
        lastExternalBackupReminderAt: new Date().toISOString(),
      });
      return { success: true };
    } catch {
      return { success: false, errorCode: "BACKUP_STATE_UNAVAILABLE" };
    }
  }

  isRestoreActive() {
    return this.restoreInProgress;
  }

  isOperationActive() {
    return this.backupInProgress || this.restoreInProgress;
  }

  prepareForShutdown() {
    this.shuttingDown = true;
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

  writeState(state) {
    const task = this.stateWriteQueue.then(() => this.writeStateNow(state));
    this.stateWriteQueue = task.catch(() => undefined);
    return task;
  }

  async writeStateNow(state) {
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

  async readState() {
    const value = await readFile(this.statePath(), "utf8")
      .then((content) => JSON.parse(content))
      .catch(() => ({}));
    return {
      ...value,
      autoBackupEnabled: value.autoBackupEnabled !== false,
      autoBackupRetention: [7, 14, 30].includes(value.autoBackupRetention)
        ? value.autoBackupRetention
        : DEFAULT_AUTO_RETENTION,
      backupHistory: Array.isArray(value.backupHistory)
        ? value.backupHistory.filter((entry) => this.validHistoryEntry(entry))
        : [],
    };
  }

  async rememberRestoreCandidate(filePath, result) {
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
  }

  addHistoryEntry(history, entry) {
    return [entry, ...(history ?? [])]
      .filter(
        (item, index, values) =>
          values.findIndex(
            (candidate) =>
              candidate.fileName === item.fileName &&
              candidate.createdAt === item.createdAt &&
              candidate.type === item.type,
          ) === index,
      )
      .slice(0, 20);
  }

  mergeHistory(localHistory, persistedHistory) {
    const currentLocation = this.lastLocation;
    const persisted = (persistedHistory ?? []).map((entry) => ({
      ...entry,
      locationId:
        currentLocation && entry.fileName === path.basename(currentLocation.filePath)
          ? currentLocation.id
          : undefined,
      canOpen:
        Boolean(currentLocation) &&
        entry.fileName === path.basename(currentLocation?.filePath ?? ""),
      canRestore: false,
      canDelete: false,
    }));
    return [...localHistory, ...persisted]
      .filter(
        (entry, index, values) =>
          values.findIndex(
            (candidate) =>
              candidate.fileName === entry.fileName &&
              candidate.createdAt === entry.createdAt &&
              candidate.type === entry.type,
          ) === index,
      )
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .slice(0, 5);
  }

  validHistoryEntry(entry) {
    return (
      entry &&
      typeof entry.fileName === "string" &&
      typeof entry.size === "number" &&
      typeof entry.createdAt === "string" &&
      ["MANUAL", "EXTERNAL"].includes(entry.type) &&
      entry.status === "SUCCESS"
    );
  }

  externalReminderDue({
    now,
    firstSeenAt,
    lastExternalBackupAt,
    lastExternalBackupReminderAt,
    lastRestoreAt,
    hasImportantData,
  }) {
    if (!hasImportantData) return false;
    const firstSeen = Date.parse(firstSeenAt);
    if (!Number.isFinite(firstSeen) || now.getTime() - firstSeen < DAY_MS) {
      return false;
    }
    const restoredAt = Date.parse(lastRestoreAt ?? "");
    if (Number.isFinite(restoredAt) && now.getTime() - restoredAt < DAY_MS) {
      return false;
    }
    const externalAt = Date.parse(lastExternalBackupAt ?? "");
    if (
      Number.isFinite(externalAt) &&
      now.getTime() - externalAt <= EXTERNAL_BACKUP_MAX_AGE_DAYS * DAY_MS
    ) {
      return false;
    }
    const reminderAt = Date.parse(lastExternalBackupReminderAt ?? "");
    return (
      !Number.isFinite(reminderAt) ||
      now.getTime() - reminderAt >= EXTERNAL_REMINDER_INTERVAL_DAYS * DAY_MS
    );
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
