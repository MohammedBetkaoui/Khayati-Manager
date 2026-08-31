const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

test("preload exposes only controlled business methods", async () => {
  const source = await readFile(path.join(__dirname, "preload.js"), "utf8");
  assert.doesNotMatch(source, /exposeInMainWorld\(["']ipcRenderer["']/);
  assert.doesNotMatch(source, /exposeInMainWorld\(["']fs["']/);
  assert.doesNotMatch(source, /exposeInMainWorld\(["']path["']/);
  assert.match(source, /exposeInMainWorld\(["']khayatiBackup["']/);
  assert.match(source, /backup:create/);
  assert.match(source, /backup:select-restore-file/);
  assert.match(source, /backup:restore/);
  assert.match(source, /backup:restore-progress/);
  assert.match(source, /backup:update-auto-settings/);
  assert.match(source, /backup:retry-auto/);
  assert.match(source, /backup:auto-status/);
  assert.match(source, /backup:delete-known/);
});
