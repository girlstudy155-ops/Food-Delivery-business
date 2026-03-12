const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

let metroProcess = null;

function exitWithError(message) {
  console.error(message);
  if (metroProcess) metroProcess.kill();
  process.exit(1);
}

function setupSignalHandlers() {
  const cleanup = () => {
    if (metroProcess) {
      console.log("Cleaning up Metro process...");
      metroProcess.kill();
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("SIGHUP", cleanup);
}

function stripProtocol(domain) {
  let urlString = domain.trim();
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }
  return new URL(urlString).host;
}

/* ===========================
   UPDATED: No EXPO_PUBLIC_DOMAIN
=========================== */
function getDeploymentDomain() {
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    return stripProtocol(process.env.REPLIT_INTERNAL_APP_DOMAIN);
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    return stripProtocol(process.env.REPLIT_DEV_DOMAIN);
  }

  console.log("No deployment domain found. Using localhost:3000");
  return "localhost:3000";
}

function prepareDirectories(timestamp) {
  console.log("Preparing build directories...");

  if (fs.existsSync("static-build")) {
    fs.rmSync("static-build", { recursive: true });
  }

  const dirs = [
    path.join("static-build", timestamp, "_expo", "static", "js", "ios"),
    path.join("static-build", timestamp, "_expo", "static", "js", "android"),
    path.join("static-build", "ios"),
    path.join("static-build", "android"),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log("Build:", timestamp);
}

function clearMetroCache() {
  console.log("Clearing Metro cache...");
  if (fs.existsSync(".metro-cache")) {
    fs.rmSync(".metro-cache", { recursive: true, force: true });
  }
  if (fs.existsSync("node_modules/.cache/metro")) {
    fs.rmSync("node_modules/.cache/metro", { recursive: true, force: true });
  }
  console.log("Cache cleared");
}

async function checkMetroHealth() {
  try {
    const response = await fetch("http://localhost:8081/status");
    return response.ok;
  } catch {
    return false;
  }
}

/* ===========================
   UPDATED: No EXPO_PUBLIC_DOMAIN ENV
=========================== */
async function startMetro() {
  const isRunning = await checkMetroHealth();
  if (isRunning) {
    console.log("Metro already running");
    return;
  }

  console.log("Starting Metro...");

  metroProcess = spawn("npm", ["run", "expo:start:static:build"], {
    stdio: "inherit",
    env: process.env,
  });

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const healthy = await checkMetroHealth();
    if (healthy) {
      console.log("Metro ready");
      return;
    }
  }

  exitWithError("Metro timeout");
}

async function downloadFile(url, outputPath) {
  console.log(`Downloading: ${url}`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const file = fs.createWriteStream(outputPath);
  await pipeline(Readable.fromWeb(response.body), file);
}

async function downloadBundle(platform, timestamp) {
  const url = new URL(
    "http://localhost:8081/node_modules/expo-router/entry.bundle"
  );
  url.searchParams.set("platform", platform);
  url.searchParams.set("dev", "false");
  url.searchParams.set("minify", "true");

  const output = path.join(
    "static-build",
    timestamp,
    "_expo",
    "static",
    "js",
    platform,
    "bundle.js"
  );

  await downloadFile(url.toString(), output);
}

async function downloadManifest(platform) {
  const response = await fetch("http://localhost:8081/manifest", {
    headers: { "expo-platform": platform },
  });

  if (!response.ok) {
    throw new Error(`Manifest HTTP ${response.status}`);
  }

  return response.json();
}

async function downloadBundlesAndManifests(timestamp) {
  const [iosBundle, androidBundle, iosManifest, androidManifest] =
    await Promise.all([
      downloadBundle("ios", timestamp),
      downloadBundle("android", timestamp),
      downloadManifest("ios"),
      downloadManifest("android"),
    ]);

  return { ios: iosManifest, android: androidManifest };
}

async function main() {
  console.log("Building static Expo Go deployment...");
  setupSignalHandlers();

  const domain = getDeploymentDomain();
  const baseUrl = `https://${domain}`;
  const timestamp = `${Date.now()}-${process.pid}`;

  prepareDirectories(timestamp);
  clearMetroCache();

  /* UPDATED CALL */
  await startMetro();

  const manifests = await downloadBundlesAndManifests(timestamp);

  console.log("Build complete!");
  console.log("Deploy URL:", baseUrl);

  if (metroProcess) metroProcess.kill();
  process.exit(0);
}

main().catch((error) => {
  console.error("Build failed:", error.message);
  if (metroProcess) metroProcess.kill();
  process.exit(1);
});