const assert = require("node:assert/strict");
const test = require("node:test");
const {
  resolveDevelopmentBackendCommand,
} = require("./development-runtime");

test("launches npm through cmd.exe on Windows instead of spawning npm.cmd", () => {
  const command = resolveDevelopmentBackendCommand("win32", {
    ComSpec: "C:\\Windows\\System32\\cmd.exe",
  });

  assert.equal(command.command, "C:\\Windows\\System32\\cmd.exe");
  assert.deepEqual(command.args, [
    "/d",
    "/s",
    "/c",
    "npm.cmd run start:dev",
  ]);
});

test("uses npm directly on non-Windows systems", () => {
  assert.deepEqual(resolveDevelopmentBackendCommand("linux", {}), {
    command: "npm",
    args: ["run", "start:dev"],
  });
});
