// scripts/build.js
import {
  cpSync,
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createWriteStream } from "fs";
import archiver from "archiver";
import * as esbuild from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");

// ── Аргументи командного рядка ───────────────────────────────────────────────

const args = process.argv.slice(2);
const BROWSER =
  args.find((a) => a.startsWith("--browser="))?.split("=")[1] || "chrome";
const DO_ZIP = args.includes("--zip");
const WATCH = args.includes("--watch");

// const BROWSERS = BROWSER === "all" ? ["chrome", "firefox", "edge"] : [BROWSER];
const BROWSERS = BROWSER === "all" ? ["chrome", "edge"] : [BROWSER];

// ── Утиліти ──────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[build] ${msg}`);
}
function err(msg) {
  console.error(`[build] ERROR: ${msg}`);
}

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

// ── Мінімізація JS ───────────────────────────────────────────────────────────

async function minifyJS(filePath) {
  const code = readFileSync(filePath, "utf8");
  const result = await esbuild.transform(code, {
    minify: true,
    target: "es2020",
  });
  writeFileSync(filePath, result.code);
}

async function minifyCSS(filePath) {
  const code = readFileSync(filePath, "utf8");
  const result = await esbuild.transform(code, {
    minify: true,
    loader: "css",
  });
  writeFileSync(filePath, result.code);
}

// ── ZIP архів ────────────────────────────────────────────────────────────────

function createZip(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      log(`✓ ${outPath} (${(archive.pointer() / 1024).toFixed(1)} KB)`);
      resolve();
    });
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// ── Збірка одного браузера ───────────────────────────────────────────────────

async function buildBrowser(browser) {
  log(`Building for ${browser}...`);

  const outDir = join(DIST, browser);

  // Очистити попередню збірку
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true });
  }
  mkdirSync(outDir, { recursive: true });

  // 1. Скопіювати весь src/
  copyDir(SRC, outDir);

  // 2. Підставити правильний маніфест
  const manifestSrc = join(
    SRC,
    `manifest.${browser === "edge" ? "chrome" : browser}.json`,
  );
  const manifestDst = join(outDir, "manifest.json");

  if (!existsSync(manifestSrc)) {
    err(`Manifest not found: ${manifestSrc}`);
    err(
      `Expected: src/manifest.${browser === "edge" ? "chrome" : browser}.json`,
    );
    process.exit(1);
  }

  // Для edge використовуємо chrome маніфест (повністю сумісні)
  cpSync(manifestSrc, manifestDst);

  // Видалити вихідні маніфест-файли з dist (залишаємо тільки manifest.json)
  const toRemove = [
    "manifest.chrome.json",
    "manifest.firefox.json",
    "manifest.json.bak",
  ];
  for (const f of toRemove) {
    const p = join(outDir, f);
    if (existsSync(p) && f !== "manifest.json") {
      rmSync(p);
    }
  }

  // 3. Мінімізація (тільки не в watch режимі)
  if (!WATCH) {
    log(`Minifying JS/CSS for ${browser}...`);

    const jsFiles = [
      join(outDir, "background/background.js"),
      join(outDir, "content/content.js"),
      join(outDir, "popup/popup.js"),
      join(outDir, "options/options.js"),
      join(outDir, "shared/constants.js"),
      join(outDir, "shared/storage.js"),
      join(outDir, "shared/i18n.js"),
    ];

    const cssFiles = [
      join(outDir, "content/content.css"),
      join(outDir, "popup/popup.css"),
      join(outDir, "options/options.css"),
    ];

    for (const f of jsFiles) {
      if (existsSync(f)) await minifyJS(f);
    }
    for (const f of cssFiles) {
      if (existsSync(f)) await minifyCSS(f);
    }
  }

  log(`✓ ${browser} → dist/${browser}/`);

  // 4. ZIP архів
  if (DO_ZIP) {
    const zipPath = join(DIST, `printAIchat-${browser}.zip`);
    await createZip(outDir, zipPath);
  }
}

// ── Watch режим ──────────────────────────────────────────────────────────────

async function watchMode() {
  log("Watch mode: building once without minification...");
  await buildBrowser("chrome");
  log("Watching src/ for changes... (Ctrl+C to stop)");

  // Простий watch через Node.js fs.watch
  const { watch } = await import("fs");
  watch(SRC, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    // Ігнорувати тимчасові файли редактора
    if (filename.endsWith("~") || filename.includes(".swp")) return;

    log(`Changed: ${filename} — rebuilding...`);
    buildBrowser("chrome").catch(console.error);
  });
}

// ── Головна функція ───────────────────────────────────────────────────────────

async function main() {
  log(`Target: ${BROWSERS.join(", ")} | ZIP: ${DO_ZIP} | Watch: ${WATCH}`);

  mkdirSync(DIST, { recursive: true });

  if (WATCH) {
    await watchMode();
    return;
  }

  for (const browser of BROWSERS) {
    await buildBrowser(browser);
  }

  log("Build complete ✓");
}

main().catch((e) => {
  err(e.message);
  process.exit(1);
});
