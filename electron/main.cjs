const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const dotenv = require("dotenv");

const PORT = 3111;
let nextServer;

function waitForServer(attempts = 50) {
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(`http://127.0.0.1:${PORT}`, () => resolve());
      request.on("error", () => {
        if (attempts-- <= 0) return reject(new Error("Invoice application server did not start."));
        setTimeout(check, 400);
      });
      request.setTimeout(400, () => request.destroy());
    };
    check();
  });
}

async function createWindow() {
  const appPath = app.getAppPath();
  // The packaged app reads its local database connection from resources/app/.env.
  // This is needed because a Windows desktop shortcut may not inherit a newly set
  // DATABASE_URL environment variable.
  dotenv.config({ path: path.join(appPath, ".env") });

  const nextBinary = path.join(appPath, "node_modules", "next", "dist", "bin", "next");

  // Next.js runs privately on the user's computer. No public server is needed.
  nextServer = spawn(process.execPath, [nextBinary, "start", "-p", String(PORT), "-H", "127.0.0.1"], {
    cwd: appPath,
    env: { ...process.env, NODE_ENV: "production", ELECTRON_RUN_AS_NODE: "1" },
    windowsHide: true,
  });

  await waitForServer();

  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    title: "Laxmi Flex Printers Billing",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  await window.loadURL(`http://127.0.0.1:${PORT}`);
}

app.whenReady().then(createWindow).catch((error) => {
  console.error(error);
  app.quit();
});

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => { if (nextServer) nextServer.kill(); });