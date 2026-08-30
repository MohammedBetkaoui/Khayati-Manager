const assert = require("node:assert/strict");
const { mkdir, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  BackupManager,
  createSuggestedFileName,
  ensureKmbExtension,
} = require("./backup/backup-manager");

function jsonResponse(payload, ok = true) {
  return {
    ok,
    async json() {
      return payload;
    },
  };
}

async function fixture(overrides = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "khayati-electron-backup-"));
  const documents = path.join(root, "Documents");
  const userData = path.join(root, "UserData");
  await mkdir(documents, { recursive: true });
  await mkdir(userData, { recursive: true });
  const shellCalls = [];
  const saveSelection = overrides.saveSelection ?? {
    canceled: false,
    filePath: path.join(documents, "chosen-backup"),
  };
  const dialog = {
    async showSaveDialog() {
      return saveSelection;
    },
    async showOpenDialog() {
      return overrides.openSelection ?? { canceled: true, filePaths: [] };
    },
  };
  const app = {
    getPath(name) {
      return name === "documents" ? documents : userData;
    },
    getVersion() {
      return "1.2.3-test";
    },
  };
  const shell = {
    showItemInFolder(filePath) {
      shellCalls.push(filePath);
    },
  };
  const fetchCalls = [];
  const fetchImpl =
    overrides.fetchImpl ??
    (async (url, options) => {
      fetchCalls.push({ url, options });
      const body = JSON.parse(options.body);
      await writeFile(body.destinationPath, "valid-kmb-placeholder");
      return jsonResponse({
        success: true,
        fileName: path.basename(body.destinationPath),
        size: 12345,
        createdAt: "2026-08-30T17:00:00.000Z",
        warnings: [],
      });
    });
  const manager = new BackupManager({
    app,
    dialog,
    shell,
    getMainWindow: () => null,
    getBackendBaseUrl: () => "http://127.0.0.1:3456",
    getDesktopToken: () => "private-desktop-token",
    fetchImpl,
  });
  return { root, documents, userData, manager, fetchCalls, shellCalls };
}

test("adds the .kmb extension and generates the requested filename", () => {
  assert.equal(
    ensureKmbExtension("C:\\Backup\\atelier"),
    "C:\\Backup\\atelier.kmb",
  );
  assert.equal(
    ensureKmbExtension("C:\\Backup\\atelier.KMB"),
    "C:\\Backup\\atelier.KMB",
  );
  assert.equal(
    createSuggestedFileName(new Date(2026, 7, 30, 17, 5)),
    "KhayatiManager_Backup_2026-08-30_17-05.kmb",
  );
});

test("returns a quiet cancellation without calling the backup engine", async () => {
  const state = await fixture({ saveSelection: { canceled: true } });
  try {
    const result = await state.manager.createBackup({ language: "fr" });
    assert.deepEqual(result, { success: false, cancelled: true });
    assert.equal(state.fetchCalls.length, 0);
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test("creates a backup through the authenticated bridge and persists safe metadata", async () => {
  const state = await fixture();
  try {
    const result = await state.manager.createBackup({ language: "ar" });
    assert.equal(result.success, true);
    assert.equal(result.fileName, "chosen-backup.kmb");
    assert.equal(state.fetchCalls.length, 1);
    assert.equal(
      state.fetchCalls[0].options.headers["x-khayati-desktop-token"],
      "private-desktop-token",
    );
    const persisted = await readFile(
      path.join(state.userData, "backup-state.json"),
      "utf8",
    );
    assert.match(persisted, /chosen-backup\.kmb/);
    assert.doesNotMatch(persisted, /Documents/);

    assert.deepEqual(
      await state.manager.openBackupLocation(result.locationId),
      { success: true },
    );
    assert.equal(state.shellCalls.length, 1);
    assert.equal(
      (await state.manager.openBackupLocation("arbitrary-path-token")).success,
      false,
    );
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test("blocks a second create request while the save dialog is open", async () => {
  let releaseDialog;
  const dialogPromise = new Promise((resolve) => {
    releaseDialog = resolve;
  });
  const state = await fixture();
  state.manager.dialog.showSaveDialog = () => dialogPromise;
  try {
    const first = state.manager.createBackup({ language: "fr" });
    const second = await state.manager.createBackup({ language: "fr" });
    assert.deepEqual(second, {
      success: false,
      errorCode: "BACKUP_IN_PROGRESS",
    });
    releaseDialog({ canceled: true });
    assert.equal((await first).cancelled, true);
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test("maps backend errors without exposing technical details", async () => {
  const state = await fixture({
    fetchImpl: async () =>
      jsonResponse({ errorCode: "DESTINATION_EXISTS" }, false),
  });
  try {
    assert.deepEqual(await state.manager.createBackup({ language: "fr" }), {
      success: false,
      errorCode: "DESTINATION_EXISTS",
    });
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test("uses the same engine for the external USB-oriented action", async () => {
  const state = await fixture();
  try {
    const result = await state.manager.createExternalBackup({ language: "fr" });
    assert.equal(result.success, true);
    assert.equal(result.locationType, "EXTERNAL");
    assert.equal(state.fetchCalls.length, 1);
    assert.match(state.fetchCalls[0].url, /desktop-backup\/create$/);
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test("selects and inspects a .kmb without restoring it", async () => {
  const selectedPath = path.join(
    tmpdir(),
    `selected-backup-${Date.now()}.kmb`,
  );
  await writeFile(selectedPath, "valid-test-backup");
  const state = await fixture({
    openSelection: { canceled: false, filePaths: [selectedPath] },
    fetchImpl: async (url) => {
      assert.match(url, /desktop-backup\/inspect$/);
      return jsonResponse({
        success: true,
        fileName: "selected-backup.kmb",
        size: 4567,
        createdAt: "2026-08-30T17:00:00.000Z",
        appVersion: "1.0.0",
        statistics: {
          customers: 1,
          suppliers: 2,
          workers: 3,
          invoices: 4,
          finishedProducts: 5,
        },
        warnings: [],
      });
    },
  });
  try {
    const result = await state.manager.selectRestoreFile({ language: "ar" });
    assert.equal(result.success, true);
    assert.equal(result.valid, true);
    assert.equal(result.statistics.customers, 1);
    assert.equal(typeof result.restoreCandidateId, "string");
    assert.equal(Object.hasOwn(result, "filePath"), false);
  } finally {
    await rm(state.root, { recursive: true, force: true });
    await rm(selectedPath, { force: true });
  }
});

test("restores only the previously inspected candidate id and persists no path", async () => {
  const selectedPath = path.join(
    tmpdir(),
    `restore-candidate-${Date.now()}.kmb`,
  );
  await writeFile(selectedPath, "valid-test-backup");
  const calls = [];
  const state = await fixture({
    openSelection: { canceled: false, filePaths: [selectedPath] },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/inspect")) {
        return jsonResponse({
          success: true,
          fileName: path.basename(selectedPath),
          size: 17,
          createdAt: "2026-08-30T17:00:00.000Z",
          appVersion: "1.0.0",
          schemaVersion: 1,
          statistics: {
            customers: 1,
            suppliers: 2,
            workers: 3,
            invoices: 4,
            finishedProducts: 5,
          },
          warnings: [],
        });
      }
      if (url.endsWith("/restore-status")) {
        return jsonResponse({ success: true, active: true, step: "PREPARING" });
      }
      assert.match(url, /desktop-backup\/restore$/);
      const body = JSON.parse(options.body);
      assert.equal(body.filePath, selectedPath);
      return jsonResponse({
        success: true,
        restoredBackupFileName: path.basename(selectedPath),
        restoredBackupCreatedAt: "2026-08-30T17:00:00.000Z",
        safetyBackupFileName: "KhayatiManager_BeforeRestore_test.kmb",
        safetyBackupCreatedAt: "2026-08-30T18:00:00.000Z",
        schemaVersion: 1,
      });
    },
  });
  try {
    const inspection = await state.manager.selectRestoreFile({ language: "fr" });
    const result = await state.manager.restoreBackup({
      language: "fr",
      restoreCandidateId: inspection.restoreCandidateId,
    });
    assert.equal(result.success, true);
    assert.equal(result.willRestart, true);
    assert.equal(calls.some((call) => call.url.endsWith("/restore")), true);
    const persisted = await readFile(
      path.join(state.userData, "backup-state.json"),
      "utf8",
    );
    assert.match(persisted, /restore-candidate/);
    assert.doesNotMatch(persisted, new RegExp(state.root.replace(/\\/g, "\\\\")));
    assert.doesNotMatch(persisted, /AppData|Documents/);
  } finally {
    await rm(state.root, { recursive: true, force: true });
    await rm(selectedPath, { force: true });
  }
});

test("rejects an arbitrary restore candidate token without calling restore", async () => {
  const state = await fixture();
  try {
    assert.deepEqual(
      await state.manager.restoreBackup({
        language: "ar",
        restoreCandidateId: "renderer-supplied-path-or-token",
      }),
      { success: false, errorCode: "RESTORE_CANDIDATE_INVALID" },
    );
    assert.equal(state.fetchCalls.length, 0);
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test("rejects a restore candidate with another extension before inspection", async () => {
  let fetchCalled = false;
  const state = await fixture({
    openSelection: {
      canceled: false,
      filePaths: [path.join(tmpdir(), "not-a-backup.zip")],
    },
    fetchImpl: async () => {
      fetchCalled = true;
      return jsonResponse({ success: true });
    },
  });
  try {
    assert.deepEqual(
      await state.manager.selectRestoreFile({ language: "fr" }),
      {
        success: false,
        errorCode: "ARCHIVE_INVALID",
      },
    );
    assert.equal(fetchCalled, false);
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});
