// src/popup/popup.js

(function () {
  "use strict";

  const STORAGE_KEYS = {
    ENABLED_GLOBAL: "enabled_global",
    DISABLED_DOMAINS: "disabled_domains",
    LANGUAGE: "language",
    LAST_SYNC: "last_sync_timestamp",
    SYNC_ERROR: "last_sync_error",
  };

  const MSG = {
    SYNC_NOW: "SYNC_NOW",
    GET_STATUS: "GET_STATUS",
    TOGGLE_DOMAIN: "TOGGLE_DOMAIN",
  };

  // ── i18n ────────────────────────────────────────────────────────────────────

  function applyI18n() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const msg = chrome.i18n.getMessage(key);
      if (msg) el.textContent = msg;
    });
  }

  // ── Форматування дати ───────────────────────────────────────────────────────

  function formatSyncTime(timestamp) {
    if (!timestamp) return chrome.i18n.getMessage("popupNever") || "Never";
    const date = new Date(timestamp);
    return date.toLocaleString(chrome.i18n.getUILanguage(), {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ── UI елементи ─────────────────────────────────────────────────────────────

  const toggleGlobal = document.getElementById("toggle-global");
  const toggleSite = document.getElementById("toggle-site");
  const currentDomain = document.getElementById("current-domain");
  const lastSyncTime = document.getElementById("last-sync-time");
  const btnSync = document.getElementById("btn-sync");
  const syncStatus = document.getElementById("sync-status");
  const selectLang = document.getElementById("select-language");
  const linkOptions = document.getElementById("link-options");

  let activeDomain = "";

  // ── Ініціалізація ────────────────────────────────────────────────────────────

  async function init() {
    applyI18n();

    // Отримати поточну вкладку
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.url) {
      try {
        activeDomain = new URL(tab.url).hostname;
      } catch {
        activeDomain = "";
      }
    }
    currentDomain.textContent = activeDomain || "—";

    // Завантажити стан із storage
    const syncData = await chrome.storage.sync.get([
      STORAGE_KEYS.ENABLED_GLOBAL,
      STORAGE_KEYS.DISABLED_DOMAINS,
      STORAGE_KEYS.LANGUAGE,
    ]);
    const localData = await chrome.storage.local.get([
      STORAGE_KEYS.LAST_SYNC,
      STORAGE_KEYS.SYNC_ERROR,
    ]);

    const isGlobalEnabled = syncData[STORAGE_KEYS.ENABLED_GLOBAL] ?? true;
    const disabledDomains = syncData[STORAGE_KEYS.DISABLED_DOMAINS] ?? [];
    const lang = syncData[STORAGE_KEYS.LANGUAGE] ?? "en";

    toggleGlobal.checked = isGlobalEnabled;
    toggleSite.checked = !disabledDomains.includes(activeDomain);
    toggleSite.disabled = !isGlobalEnabled;
    selectLang.value = lang;

    lastSyncTime.textContent = formatSyncTime(
      localData[STORAGE_KEYS.LAST_SYNC],
    );

    if (localData[STORAGE_KEYS.SYNC_ERROR]) {
      showStatus(
        "error",
        chrome.i18n.getMessage("popupSyncError") || "Sync error",
      );
    }
  }

  // ── Статус синхронізації ────────────────────────────────────────────────────

  function showStatus(type, message) {
    syncStatus.textContent = message;
    syncStatus.className = `sync-status sync-status--${type}`;
    syncStatus.hidden = false;
  }

  function hideStatus() {
    syncStatus.hidden = true;
  }

  // ── Event listeners ─────────────────────────────────────────────────────────

  toggleGlobal.addEventListener("change", async () => {
    const enabled = toggleGlobal.checked;
    await chrome.storage.sync.set({ [STORAGE_KEYS.ENABLED_GLOBAL]: enabled });
    toggleSite.disabled = !enabled;
  });

  toggleSite.addEventListener("change", async () => {
    const enabled = toggleSite.checked;
    const response = await chrome.runtime.sendMessage({
      type: MSG.TOGGLE_DOMAIN,
      domain: activeDomain,
      enabled,
    });
    if (!response?.ok) {
      console.error("[printAIchat] Toggle domain failed");
    }
  });

  btnSync.addEventListener("click", async () => {
    btnSync.disabled = true;
    hideStatus();
    showStatus(
      "loading",
      chrome.i18n.getMessage("popupSyncing") || "Syncing...",
    );

    try {
      await chrome.runtime.sendMessage({ type: MSG.SYNC_NOW });
      const localData = await chrome.storage.local.get([
        STORAGE_KEYS.LAST_SYNC,
        STORAGE_KEYS.SYNC_ERROR,
      ]);
      lastSyncTime.textContent = formatSyncTime(
        localData[STORAGE_KEYS.LAST_SYNC],
      );

      if (localData[STORAGE_KEYS.SYNC_ERROR]) {
        showStatus(
          "error",
          chrome.i18n.getMessage("popupSyncError") || "Sync failed",
        );
      } else {
        showStatus(
          "success",
          chrome.i18n.getMessage("popupSyncSuccess") || "Synced!",
        );
        setTimeout(hideStatus, 3000);
      }
    } catch (err) {
      showStatus("error", "Error: " + err.message);
    } finally {
      btnSync.disabled = false;
    }
  });

  selectLang.addEventListener("change", async () => {
    await chrome.storage.sync.set({
      [STORAGE_KEYS.LANGUAGE]: selectLang.value,
    });
  });

  linkOptions.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // ── Слухати повідомлення від background ─────────────────────────────────────

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SYNC_COMPLETE") {
      lastSyncTime.textContent = formatSyncTime(message.timestamp);
      showStatus(
        "success",
        chrome.i18n.getMessage("popupSyncSuccess") || "Synced!",
      );
      setTimeout(hideStatus, 3000);
    }
    if (message.type === "SYNC_ERROR") {
      showStatus(
        "error",
        chrome.i18n.getMessage("popupSyncError") || "Sync failed",
      );
    }
  });

  // ── Старт ───────────────────────────────────────────────────────────────────

  init().catch(console.error);
})();
