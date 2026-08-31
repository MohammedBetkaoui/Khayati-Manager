function resolveDevelopmentBackendCommand(
  platform = process.platform,
  environment = process.env,
) {
  if (platform === "win32") {
    return {
      command: environment.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", "npm.cmd run start:dev"],
    };
  }

  return {
    command: "npm",
    args: ["run", "start:dev"],
  };
}

module.exports = { resolveDevelopmentBackendCommand };
