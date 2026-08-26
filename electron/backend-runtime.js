const http = require("node:http");
const net = require("node:net");

const BACKEND_HOST = "127.0.0.1";
const BACKEND_APP_ID = "khayati-manager";

function backendUrl(port) {
  return `http://${BACKEND_HOST}:${port}`;
}

function canListen(port, host = BACKEND_HOST) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ port, host, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(startPort = 3000, attempts = 100) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = startPort + offset;
    if (await canListen(port)) return port;
  }

  throw new Error(
    `Aucun port local libre trouvé entre ${startPort} et ${startPort + attempts - 1}.`,
  );
}

function readHealth(baseUrl, timeoutMs = 1200) {
  return new Promise((resolve, reject) => {
    const request = http.get(`${baseUrl}/health`, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
        if (body.length > 16_384) {
          request.destroy(new Error("Health response too large"));
        }
      });
      response.on("end", () => {
        try {
          resolve({
            statusCode: response.statusCode ?? 0,
            body: JSON.parse(body),
          });
        } catch (error) {
          reject(error);
        }
      });
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Timeout while reaching ${baseUrl}`));
    });
    request.on("error", reject);
  });
}

async function isKhayatiBackendRunning(baseUrl) {
  try {
    const health = await readHealth(baseUrl);
    return (
      health.statusCode === 200 &&
      health.body?.app === BACKEND_APP_ID &&
      health.body?.status === "ok"
    );
  } catch {
    return false;
  }
}

async function waitForKhayatiBackend(baseUrl, timeoutMs = 60_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isKhayatiBackendRunning(baseUrl)) return true;
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  throw new Error(
    `Le backend Khayati Manager ne répond pas sur ${baseUrl} après ${timeoutMs} ms.`,
  );
}

module.exports = {
  BACKEND_APP_ID,
  BACKEND_HOST,
  backendUrl,
  canListen,
  findAvailablePort,
  isKhayatiBackendRunning,
  waitForKhayatiBackend,
};
