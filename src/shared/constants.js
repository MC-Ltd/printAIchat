// src/shared/constants.js

export const EXTENSION_ID = "printaichat";

// ── GitHub data repository ──────────────────────────────────────────────────
export const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/MC-Ltd/printAIchat-data/main";

export const GITHUB_URLS = {
  rules: `${GITHUB_RAW_BASE}/rules/rules.json`,
  config: `${GITHUB_RAW_BASE}/config/defaults.json`,
  localeEn: `${GITHUB_RAW_BASE}/locales/en/messages.json`,
  localeUk: `${GITHUB_RAW_BASE}/locales/uk/messages.json`,
};

// ── chrome.storage keys ─────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  // storage.local — кеш даних з GitHub
  RULES: "gh_rules",
  CONFIG: "gh_config",
  LOCALE_EN: "gh_locale_en",
  LOCALE_UK: "gh_locale_uk",
  LAST_SYNC: "last_sync_timestamp",
  SYNC_ERROR: "last_sync_error",

  // storage.sync — налаштування користувача
  ENABLED_GLOBAL: "enabled_global",
  DISABLED_DOMAINS: "disabled_domains",
  LANGUAGE: "language",
  SYNC_INTERVAL: "sync_interval_hours",
  CUSTOM_RULES: "custom_rules",
};

// ── Alarm names ─────────────────────────────────────────────────────────────
export const ALARM_NAMES = {
  DAILY_SYNC: "daily_sync",
};

// ── Defaults ─────────────────────────────────────────────────────────────────
export const DEFAULTS = {
  ENABLED_GLOBAL: true,
  DISABLED_DOMAINS: [],
  LANGUAGE: "en",
  SYNC_INTERVAL: 24, // hours
  CUSTOM_RULES: [],
};

// ── Message types (background ↔ popup ↔ content) ────────────────────────────
export const MSG = {
  SYNC_NOW: "SYNC_NOW",
  SYNC_COMPLETE: "SYNC_COMPLETE",
  SYNC_ERROR: "SYNC_ERROR",
  GET_STATUS: "GET_STATUS",
  TOGGLE_DOMAIN: "TOGGLE_DOMAIN",
  APPLY_RULES: "APPLY_RULES",
};

// ── Fetch timeout ────────────────────────────────────────────────────────────
export const FETCH_TIMEOUT_MS = 10000; // 10 секунд
