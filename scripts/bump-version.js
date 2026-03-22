#!/usr/bin/env node
/**
 * scripts/bump-version.js
 * Автоматично оновлює версію у package.json, manifest.chrome.json,
 * manifest.firefox.json одночасно.
 *
 * Використання:
 *   node scripts/bump-version.js patch   → 1.0.0 → 1.0.1
 *   node scripts/bump-version.js minor   → 1.0.0 → 1.1.0
 *   node scripts/bump-version.js major   → 1.0.0 → 2.0.0
 *   node scripts/bump-version.js 1.2.3   → встановити конкретну версію
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Файли для оновлення
const FILES = {
  package:         resolve(ROOT, 'package.json'),
  manifestChrome:  resolve(ROOT, 'src', 'manifest.chrome.json'),
  manifestFirefox: resolve(ROOT, 'src', 'manifest.firefox.json'),
};

/**
 * Читає JSON-файл і повертає об'єкт + оригінальний відступ
 */
function readJSON(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  // Визначаємо відступ з файлу (2 або 4 пробіли)
  const match = raw.match(/^{\n(\s+)/);
  const indent = match ? match[1] : '  ';
  return { data, indent };
}

/**
 * Записує JSON-файл зі збереженням відступу і кінцевим переносом рядка
 */
function writeJSON(filePath, data, indent) {
  const content = JSON.stringify(data, null, indent) + '\n';
  writeFileSync(filePath, content, 'utf8');
}

/**
 * Розбирає версію на компоненти
 */
function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Невалідна версія: "${version}". Очікується формат X.Y.Z`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Обчислює нову версію на основі bump-типу або конкретної версії
 */
function computeNewVersion(currentVersion, bumpType) {
  // Якщо передали конкретну версію (не patch/minor/major)
  if (!['patch', 'minor', 'major'].includes(bumpType)) {
    const parsed = parseVersion(bumpType);
    return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  }

  const { major, minor, patch } = parseVersion(currentVersion);

  switch (bumpType) {
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'major': return `${major + 1}.0.0`;
    default:      throw new Error(`Невідомий тип: "${bumpType}"`);
  }
}

/**
 * Головна функція
 */
function main() {
  const bumpType = process.argv[2];

  if (!bumpType) {
    console.error('❌ Вкажіть тип bump або конкретну версію.');
    console.error('   Використання: node scripts/bump-version.js [patch|minor|major|X.Y.Z]');
    process.exit(1);
  }

  // Читаємо поточну версію з package.json (джерело правди)
  const { data: pkg, indent: pkgIndent } = readJSON(FILES.package);
  const currentVersion = pkg.version;

  if (!currentVersion) {
    console.error('❌ Не знайдено поле "version" у package.json');
    process.exit(1);
  }

  // Обчислюємо нову версію
  let newVersion;
  try {
    newVersion = computeNewVersion(currentVersion, bumpType);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  // Перевіряємо що версія зросла (якщо не явне встановлення)
  if (['patch', 'minor', 'major'].includes(bumpType)) {
    const current = parseVersion(currentVersion);
    const next    = parseVersion(newVersion);
    const isGreater =
      next.major > current.major ||
      (next.major === current.major && next.minor > current.minor) ||
      (next.major === current.major && next.minor === current.minor && next.patch > current.patch);

    if (!isGreater) {
      console.error(`❌ Нова версія ${newVersion} не більша за поточну ${currentVersion}`);
      process.exit(1);
    }
  }

  console.log(`\n🔄 Оновлення версії: ${currentVersion} → ${newVersion}\n`);

  // 1. Оновлюємо package.json
  pkg.version = newVersion;
  writeJSON(FILES.package, pkg, pkgIndent);
  console.log(`✅ package.json              → ${newVersion}`);

  // 2. Оновлюємо manifest.chrome.json
  const { data: manifestChrome, indent: chromeIndent } = readJSON(FILES.manifestChrome);
  manifestChrome.version = newVersion;
  writeJSON(FILES.manifestChrome, manifestChrome, chromeIndent);
  console.log(`✅ manifest.chrome.json      → ${newVersion}`);

  // 3. Оновлюємо manifest.firefox.json
  const { data: manifestFirefox, indent: ffIndent } = readJSON(FILES.manifestFirefox);
  manifestFirefox.version = newVersion;
  writeJSON(FILES.manifestFirefox, manifestFirefox, ffIndent);
  console.log(`✅ manifest.firefox.json     → ${newVersion}`);

  // Фінальне повідомлення з підказками
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Версія успішно оновлена до ${newVersion}

📋 Наступні кроки:
   1. Оновіть CHANGELOG.md (розділ [${newVersion}])
   2. git add package.json src/manifest.chrome.json src/manifest.firefox.json CHANGELOG.md
   3. git commit -m "chore: bump version to ${newVersion}"
   4. git tag v${newVersion}
   5. git push origin main --tags
      → CI/CD автоматично створить GitHub Release з ZIP-файлами
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main();
