// src/background/background.js

import {
  GITHUB_URLS,
  STORAGE_KEYS,
  ALARM_NAMES,
  DEFAULTS,
  MSG,
  FETCH_TIMEOUT_MS,
} from "../shared/constants.js";
import { storage } from "../shared/storage.js";

// ── Ініціалізація ────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  console.log("[printAIchat] onInstalled, reason:", reason);

  // Встановити дефолтні налаштування (лише якщо ще не існують)
  const existing = await storage.sync.get(Object.values(STORAGE_KEYS));
  const defaults = {};

  if (existing[STORAGE_KEYS.ENABLED_GLOBAL] === undefined) {
    defaults[STORAGE_KEYS.ENABLED_GLOBAL] = DEFAULTS.ENABLED_GLOBAL;
  }
  if (existing[STORAGE_KEYS.DISABLED_DOMAINS] === undefined) {
    defaults[STORAGE_KEYS.DISABLED_DOMAINS] = DEFAULTS.DISABLED_DOMAINS;
  }
  if (existing[STORAGE_KEYS.LANGUAGE] === undefined) {
    defaults[STORAGE_KEYS.LANGUAGE] = DEFAULTS.LANGUAGE;
  }
  if (existing[STORAGE_KEYS.SYNC_INTERVAL] === undefined) {
    defaults[STORAGE_KEYS.SYNC_INTERVAL] = DEFAULTS.SYNC_INTERVAL;
  }
  if (existing[STORAGE_KEYS.CUSTOM_RULES] === undefined) {
    defaults[STORAGE_KEYS.CUSTOM_RULES] = DEFAULTS.CUSTOM_RULES;
  }

  if (Object.keys(defaults).length > 0) {
    await storage.sync.set(defaults);
  }

  // Перша синхронізація з GitHub
  await syncFromGitHub();

  // Встановити щоденний alarm
  await setupDailyAlarm();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log("[printAIchat] onStartup");
  await syncFromGitHub();
  await setupDailyAlarm();
});

// ── Alarms ───────────────────────────────────────────────────────────────────

async function setupDailyAlarm() {
  const {
    [STORAGE_KEYS.SYNC_INTERVAL]: intervalHours = DEFAULTS.SYNC_INTERVAL,
  } = await storage.sync.get(STORAGE_KEYS.SYNC_INTERVAL);

  // Видалити попередній alarm якщо є
  await chrome.alarms.clear(ALARM_NAMES.DAILY_SYNC);

  chrome.alarms.create(ALARM_NAMES.DAILY_SYNC, {
    delayInMinutes: intervalHours * 60,
    periodInMinutes: intervalHours * 60,
  });

  console.log(`[printAIchat] Alarm set: every ${intervalHours}h`);
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAMES.DAILY_SYNC) {
    console.log("[printAIchat] Alarm fired: daily sync");
    await syncFromGitHub();
  }
});

// ── GitHub sync ───────────────────────────────────────────────────────────────

/**
 * Завантажує файл з GitHub raw URL із таймаутом.
 * При помилці повертає null (не кидає виняток).
 *
 * @param {string} url
 * @returns {Promise<string|null>}
 */
async function fetchFromGitHub(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      // Cache-busting: GitHub CDN кешує агресивно
      headers: { "Cache-Control": "no-cache" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return await response.text();
  } catch (err) {
    if (err.name === "AbortError") {
      console.error(`[printAIchat] Fetch timeout: ${url}`);
    } else {
      console.error(`[printAIchat] Fetch error: ${url}`, err.message);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Головна функція синхронізації.
 * Завантажує всі файли з GitHub, зберігає у storage.local.
 * При помилці мережі — продовжує роботу з кешем.
 */
async function syncFromGitHub() {
  console.log("[printAIchat] Starting GitHub sync...");

  const results = await Promise.allSettled([
    fetchFromGitHub(GITHUB_URLS.rules),
    fetchFromGitHub(GITHUB_URLS.config),
    fetchFromGitHub(GITHUB_URLS.localeEn),
    fetchFromGitHub(GITHUB_URLS.localeUk),
  ]);

  const [rulesRaw, configRaw, localeEnRaw, localeUkRaw] = results;

  const toStore = {};
  let hasError = false;

  if (rulesRaw.status === "fulfilled" && rulesRaw.value) {
    try {
      toStore[STORAGE_KEYS.RULES] = JSON.parse(rulesRaw.value);
    } catch {
      console.error("[printAIchat] Invalid JSON in rules");
      hasError = true;
    }
  } else {
    hasError = true;
  }

  if (configRaw.status === "fulfilled" && configRaw.value) {
    try {
      toStore[STORAGE_KEYS.CONFIG] = JSON.parse(configRaw.value);
    } catch {
      console.error("[printAIchat] Invalid JSON in config");
      hasError = true;
    }
  } else {
    hasError = true;
  }

  if (localeEnRaw.status === "fulfilled" && localeEnRaw.value) {
    try {
      toStore[STORAGE_KEYS.LOCALE_EN] = JSON.parse(localeEnRaw.value);
    } catch {
      console.error("[printAIchat] Invalid JSON in locale/en");
      hasError = true;
    }
  }

  if (localeUkRaw.status === "fulfilled" && localeUkRaw.value) {
    try {
      toStore[STORAGE_KEYS.LOCALE_UK] = JSON.parse(localeUkRaw.value);
    } catch {
      console.error("[printAIchat] Invalid JSON in locale/uk");
      hasError = true;
    }
  }

  // Зберегти все що вдалося завантажити
  if (Object.keys(toStore).length > 0) {
    await storage.local.set(toStore);
  }

  // Записати мітку часу та статус
  await storage.local.set({
    [STORAGE_KEYS.LAST_SYNC]: Date.now(),
    [STORAGE_KEYS.SYNC_ERROR]: hasError,
  });

  console.log("[printAIchat] Sync complete. Error:", hasError);

  // Сповістити popup якщо відкритий
  try {
    await chrome.runtime.sendMessage({
      type: hasError ? MSG.SYNC_ERROR : MSG.SYNC_COMPLETE,
      timestamp: Date.now(),
    });
  } catch {
    // Popup не відкритий — це нормально, ігноруємо
  }
}

// ── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case MSG.SYNC_NOW:
      syncFromGitHub().then(() => sendResponse({ ok: true }));
      return true; // async response

    case MSG.GET_STATUS:
      storage.local
        .get([STORAGE_KEYS.LAST_SYNC, STORAGE_KEYS.SYNC_ERROR])
        .then((data) =>
          sendResponse({
            lastSync: data[STORAGE_KEYS.LAST_SYNC] || null,
            syncError: data[STORAGE_KEYS.SYNC_ERROR] || false,
          }),
        );
      return true; // async response

    case MSG.TOGGLE_DOMAIN: {
      const { domain, enabled } = message;
      storage.sync
        .get(STORAGE_KEYS.DISABLED_DOMAINS)
        .then((data) => {
          let disabled = data[STORAGE_KEYS.DISABLED_DOMAINS] || [];
          if (enabled) {
            disabled = disabled.filter((d) => d !== domain);
          } else {
            if (!disabled.includes(domain)) disabled.push(domain);
          }
          return storage.sync.set({
            [STORAGE_KEYS.DISABLED_DOMAINS]: disabled,
          });
        })
        .then(() => sendResponse({ ok: true }));
      return true; // async response
    }

    default:
      break;
  }
});
