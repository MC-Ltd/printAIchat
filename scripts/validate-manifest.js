// scripts/validate-manifest.js
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const REQUIRED_FIELDS = [
  "manifest_version",
  "name",
  "version",
  "description",
  "icons",
  "background",
  "content_scripts",
  "permissions",
];

const REQUIRED_PERMISSIONS = ["storage", "alarms", "scripting", "activeTab"];
const REQUIRED_ICON_SIZES = ["16", "32", "48", "128"];

function validateManifest(manifestPath, browserName) {
  console.log(`\n[validate] Checking ${browserName} manifest...`);

  if (!existsSync(manifestPath)) {
    console.error(`[validate] ERROR: ${manifestPath} not found`);
    return false;
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    console.error(`[validate] ERROR: Invalid JSON — ${err.message}`);
    return false;
  }

  let valid = true;

  // Обов'язкові поля
  for (const field of REQUIRED_FIELDS) {
    if (!manifest[field]) {
      console.error(`[validate] ERROR: Missing required field: "${field}"`);
      valid = false;
    }
  }

  // Версія manifest
  if (manifest.manifest_version !== 3) {
    console.error(
      `[validate] ERROR: manifest_version must be 3, got ${manifest.manifest_version}`,
    );
    valid = false;
  }

  // Формат версії розширення
  if (manifest.version && !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
    console.error(
      `[validate] ERROR: version must be X.Y.Z format, got "${manifest.version}"`,
    );
    valid = false;
  }

  // Permissions
  const perms = manifest.permissions || [];
  for (const perm of REQUIRED_PERMISSIONS) {
    if (!perms.includes(perm)) {
      console.error(`[validate] ERROR: Missing permission: "${perm}"`);
      valid = false;
    }
  }

  // Іконки
  const icons = manifest.icons || {};
  for (const size of REQUIRED_ICON_SIZES) {
    if (!icons[size]) {
      console.error(`[validate] ERROR: Missing icon size: ${size}px`);
      valid = false;
    }
  }

  // default_locale
  if (!manifest.default_locale) {
    console.warn(`[validate] WARN: default_locale not set`);
  }

  if (valid) {
    console.log(`[validate] ✓ ${browserName} manifest is valid`);
  }

  return valid;
}

// Валідувати всі маніфести
const results = [
  validateManifest(join(ROOT, "src/manifest.chrome.json"), "Chrome"),
];

const allValid = results.every(Boolean);
if (!allValid) {
  console.error("\n[validate] Build aborted: fix manifest errors above");
  process.exit(1);
}

console.log("\n[validate] All manifests valid ✓");
