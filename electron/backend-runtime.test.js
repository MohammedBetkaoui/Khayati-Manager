const assert = require("node:assert/strict");
const http = require("node:http");
const net = require("node:net");
const test = require("node:test");
const {
  backendUrl,
  findAvailablePort,
  isKhayatiBackendRunning,
  waitForKhayatiBackend,
} = require("./backend-runtime");

function listen(server, port = 0) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

test("selects another port when the preferred port is occupied", async () => {
  const occupiedServer = net.createServer();
  const occupiedPort = await listen(occupiedServer);

  try {
    const selectedPort = await findAvailablePort(occupiedPort, 10);
    assert.notEqual(selectedPort, occupiedPort);
    assert.ok(selectedPort > occupiedPort);
  } finally {
    await close(occupiedServer);
  }
});

test("accepts only the Khayati Manager health response", async () => {
  const validServer = http.createServer((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ app: "khayati-manager", status: "ok" }));
  });
  const validPort = await listen(validServer);

  try {
    const baseUrl = backendUrl(validPort);
    assert.equal(await isKhayatiBackendRunning(baseUrl), true);
    assert.equal(await waitForKhayatiBackend(baseUrl, 1_000), true);
  } finally {
    await close(validServer);
  }

  const foreignServer = http.createServer((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ app: "another-application", status: "ok" }));
  });
  const foreignPort = await listen(foreignServer);

  try {
    assert.equal(await isKhayatiBackendRunning(backendUrl(foreignPort)), false);
  } finally {
    await close(foreignServer);
  }
});
