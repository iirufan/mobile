// Creates the Android Studio project (android/) for Salah Bell.
// Safe to run again: it rebuilds an unfinished android/ folder and re-copies resources.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const run = (cmd) => execSync(cmd, { cwd: root, stdio: "inherit" });
const log = (m) => console.log(`\n> ${m}`);

if (!fs.existsSync(path.join(root, "node_modules", "@capacitor", "android"))) {
  console.error("Capacitor is not installed yet. Run `npm install` first.");
  process.exit(1);
}

// Capacitor's JS runtime, so www/ works without a bundler
const coreJs = path.join(root, "node_modules", "@capacitor", "core", "dist", "capacitor.js");
fs.writeFileSync(path.join(root, "www", "capacitor.js"),
  fs.existsSync(coreJs) ? fs.readFileSync(coreJs) : "/* runtime injected by the native bridge */\n");

const android = path.join(root, "android");
const manifestPath = path.join(android, "app", "src", "main", "AndroidManifest.xml");
if (fs.existsSync(android) && !fs.existsSync(manifestPath)) {
  log("Found an unfinished android/ folder, removing it");
  fs.rmSync(android, { recursive: true, force: true });
}
if (!fs.existsSync(android)) {
  log("Creating Android project");
  run("npx cap add android");
  if (!fs.existsSync(manifestPath)) {
    console.error("\nThe Android project did not get created. Run `npm install` again, then `npm run setup`.");
    process.exit(1);
  }
}

// Notification icon
const copyDir = (from, to) => {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    e.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b);
  }
};
// Remove Capacitor's default launcher icons so our custom icon is the only one (avoids
// duplicate-resource errors between its .webp and our .png, and makes sure ours is used).
const resDir = path.join(android, "app", "src", "main", "res");
for (const d of fs.existsSync(resDir) ? fs.readdirSync(resDir) : []) {
  const dir = path.join(resDir, d);
  if (!fs.statSync(dir).isDirectory()) continue;
  if (d.startsWith("mipmap")) {
    for (const f of fs.readdirSync(dir)) if (f.startsWith("ic_launcher")) fs.rmSync(path.join(dir, f));
  }
  if (d.startsWith("drawable")) {
    for (const f of fs.readdirSync(dir)) if (f.startsWith("ic_launcher_foreground")) fs.rmSync(path.join(dir, f));
  }
}
log("Adding app icon");
copyDir(path.join(root, "native", "res"), path.join(android, "app", "src", "main", "res"));

// Make sure the exact-alarm permission is present (the plugin adds its own, this is a safety net)
let manifest = fs.readFileSync(manifestPath, "utf8");
if (!manifest.includes("SCHEDULE_EXACT_ALARM")) {
  manifest = manifest.replace(/(\s*)<application/,
    `\n    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />` +
    `\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />$1<application`);
  fs.writeFileSync(manifestPath, manifest);
}

log("Syncing web files and plugins");
run("npx cap sync android");
log("Done. Open the project with:  npx cap open android   (or: npm run android)");
