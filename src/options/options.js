// src/options/options.js

(function () {
  "use strict";

  const STORAGE_KEYS = {
    ENABLED_GLOBAL: "enabled_global",
    DISABLED_DOMAINS: "disabled_domains",
    LANGUAGE: "language",
    SYNC_INTERVAL: "sync_interval_hours",
    CUSTOM_RULES: "custom_rules",
    RULES: "gh_rules",
    LAST_SYNC: "last_sync_timestamp",
    SYNC_ERROR: "last_sync_error",
  };

  const MSG = { SYNC_NOW: "SYNC_NOW" };

  // ── i18n ────────────────────────────────────────────────────────────────────

  function applyI18n() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const msg = chrome.i18n.getMessage(el.getAttribute("data-i18n"));
      if (msg) el.textContent = msg;
    });
    // Placeholder для input
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const msg = chrome.i18n.getMessage(
        el.getAttribute("data-i18n-placeholder"),
      );
      if (msg) el.placeholder = msg;
    });
  }

  // ── Toast ────────────────────────────────────────────────────────────────────

  let toastTimer = null;
  function showToast(message, duration = 3000) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, duration);
  }

  // ── Форматування дати ───────────────────────────────────────────────────────

  function formatDate(timestamp) {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleString(chrome.i18n.getUILanguage(), {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ── Версія розширення ───────────────────────────────────────────────────────

  function renderVersion() {
    const manifest = chrome.runtime.getManifest();
    document.getElementById("ext-version").textContent = `v${manifest.version}`;
  }

  // ── Загальні налаштування ───────────────────────────────────────────────────

  async function loadGeneralSettings() {
    const data = await chrome.storage.sync.get([
      STORAGE_KEYS.ENABLED_GLOBAL,
      STORAGE_KEYS.LANGUAGE,
      STORAGE_KEYS.SYNC_INTERVAL,
    ]);

    document.getElementById("opt-enabled-global").checked =
      data[STORAGE_KEYS.ENABLED_GLOBAL] ?? true;
    document.getElementById("opt-language").value =
      data[STORAGE_KEYS.LANGUAGE] ?? "en";
    document.getElementById("opt-sync-interval").value =
      data[STORAGE_KEYS.SYNC_INTERVAL] ?? 24;
  }

  document
    .getElementById("opt-enabled-global")
    .addEventListener("change", async (e) => {
      await chrome.storage.sync.set({
        [STORAGE_KEYS.ENABLED_GLOBAL]: e.target.checked,
      });
      showToast(chrome.i18n.getMessage("optionsSaved") || "Saved");
    });

  document
    .getElementById("opt-language")
    .addEventListener("change", async (e) => {
      await chrome.storage.sync.set({
        [STORAGE_KEYS.LANGUAGE]: e.target.value,
      });
      showToast(chrome.i18n.getMessage("optionsSaved") || "Saved");
    });

  document
    .getElementById("opt-sync-interval")
    .addEventListener("change", async (e) => {
      const val = Math.min(
        168,
        Math.max(1, parseInt(e.target.value, 10) || 24),
      );
      e.target.value = val;
      await chrome.storage.sync.set({ [STORAGE_KEYS.SYNC_INTERVAL]: val });
      showToast(chrome.i18n.getMessage("optionsSaved") || "Saved");
    });

  // ── Вимкнені домени ─────────────────────────────────────────────────────────

  async function renderDomainList() {
    const data = await chrome.storage.sync.get(STORAGE_KEYS.DISABLED_DOMAINS);
    const domains = data[STORAGE_KEYS.DISABLED_DOMAINS] || [];
    const list = document.getElementById("disabled-domains-list");

    list.innerHTML = "";

    if (domains.length === 0) {
      list.innerHTML = `<li style="color: var(--color-muted); font-size: 13px; padding: 8px 0;">
        ${chrome.i18n.getMessage("optionsNoDisabledDomains") || "No disabled domains"}
      </li>`;
      return;
    }

    domains.forEach((domain) => {
      const li = document.createElement("li");
      li.className = "domain-list__item";
      li.innerHTML = `
        <span>${domain}</span>
        <button class="domain-list__remove" data-domain="${domain}"
          title="${chrome.i18n.getMessage("optionsRemove") || "Remove"}">×</button>
      `;
      list.appendChild(li);
    });

    list.querySelectorAll(".domain-list__remove").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const domainToRemove = btn.getAttribute("data-domain");
        const current = await chrome.storage.sync.get(
          STORAGE_KEYS.DISABLED_DOMAINS,
        );
        const updated = (current[STORAGE_KEYS.DISABLED_DOMAINS] || []).filter(
          (d) => d !== domainToRemove,
        );
        await chrome.storage.sync.set({
          [STORAGE_KEYS.DISABLED_DOMAINS]: updated,
        });
        await renderDomainList();
      });
    });
  }

  document
    .getElementById("btn-add-domain")
    .addEventListener("click", async () => {
      const input = document.getElementById("new-domain-input");
      const domain = input.value.trim().toLowerCase();

      if (!domain) return;

      // Базова валідація домену
      if (!/^(\*\.)?[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
        showToast(
          chrome.i18n.getMessage("optionsInvalidDomain") ||
            "Invalid domain format",
        );
        return;
      }

      const data = await chrome.storage.sync.get(STORAGE_KEYS.DISABLED_DOMAINS);
      const domains = data[STORAGE_KEYS.DISABLED_DOMAINS] || [];

      if (!domains.includes(domain)) {
        domains.push(domain);
        await chrome.storage.sync.set({
          [STORAGE_KEYS.DISABLED_DOMAINS]: domains,
        });
      }

      input.value = "";
      await renderDomainList();
      showToast(chrome.i18n.getMessage("optionsDomainAdded") || "Domain added");
    });

  // ── Правила з GitHub ────────────────────────────────────────────────────────

  async function renderRulesList() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.RULES);
    const ghRules = data[STORAGE_KEYS.RULES];
    const container = document.getElementById("rules-list");
    const countEl = document.getElementById("rules-count");

    if (!ghRules || !ghRules.rules || ghRules.rules.length === 0) {
      countEl.textContent =
        chrome.i18n.getMessage("optionsNoRules") ||
        "No rules loaded from GitHub yet.";
      container.innerHTML = "";
      return;
    }

    const rules = ghRules.rules;
    countEl.textContent =
      (chrome.i18n.getMessage("optionsRulesCount") || "Rules loaded:") +
      ` ${rules.length}`;

    container.innerHTML = "";
    rules.forEach((rule, idx) => {
      const item = document.createElement("div");
      item.className = "rule-item";
      item.innerHTML = `
        <div>
          <div>${rule.name || rule.selector || "Rule " + (idx + 1)}</div>
          <div class="rule-item__meta">
            ${rule.action} · ${(rule.domains || ["*"]).join(", ")}
          </div>
        </div>
        <label class="toggle">
          <input type="checkbox" data-rule-idx="${idx}"
            ${rule.disabled ? "" : "checked"} />
          <span class="toggle__slider"></span>
        </label>
      `;
      container.appendChild(item);
    });

    // Toggle окремого правила
    container.querySelectorAll("input[data-rule-idx]").forEach((chk) => {
      chk.addEventListener("change", async () => {
        const idx = parseInt(chk.getAttribute("data-rule-idx"), 10);
        const freshData = await chrome.storage.local.get(STORAGE_KEYS.RULES);
        const freshRules = freshData[STORAGE_KEYS.RULES];
        freshRules.rules[idx].disabled = !chk.checked;
        await chrome.storage.local.set({ [STORAGE_KEYS.RULES]: freshRules });
        showToast(chrome.i18n.getMessage("optionsSaved") || "Saved");
      });
    });
  }

  // ── Кастомні правила ────────────────────────────────────────────────────────

  async function loadCustomRules() {
    const data = await chrome.storage.sync.get(STORAGE_KEYS.CUSTOM_RULES);
    const rules = data[STORAGE_KEYS.CUSTOM_RULES] || [];
    document.getElementById("custom-rules-input").value = JSON.stringify(
      rules,
      null,
      2,
    );
  }

  function validateCustomRulesJSON(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) throw new Error("Must be a JSON array");
      parsed.forEach((rule, i) => {
        if (!rule.action) throw new Error(`Rule ${i}: missing "action"`);
        if (!rule.selector) throw new Error(`Rule ${i}: missing "selector"`);
      });
      return { ok: true, data: parsed };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  document
    .getElementById("btn-validate-custom")
    .addEventListener("click", () => {
      const errorEl = document.getElementById("custom-rules-error");
      const result = validateCustomRulesJSON(
        document.getElementById("custom-rules-input").value,
      );
      if (result.ok) {
        errorEl.hidden = true;
        showToast(
          chrome.i18n.getMessage("optionsValidOk") || "JSON is valid ✓",
        );
      } else {
        errorEl.textContent = result.error;
        errorEl.hidden = false;
      }
    });

  document
    .getElementById("btn-save-custom")
    .addEventListener("click", async () => {
      const errorEl = document.getElementById("custom-rules-error");
      const result = validateCustomRulesJSON(
        document.getElementById("custom-rules-input").value,
      );
      if (!result.ok) {
        errorEl.textContent = result.error;
        errorEl.hidden = false;
        return;
      }
      errorEl.hidden = true;
      await chrome.storage.sync.set({
        [STORAGE_KEYS.CUSTOM_RULES]: result.data,
      });
      showToast(chrome.i18n.getMessage("optionsSaved") || "Saved");
    });

  // ── Синхронізація ───────────────────────────────────────────────────────────

  async function loadSyncStatus() {
    const data = await chrome.storage.local.get([
      STORAGE_KEYS.LAST_SYNC,
      STORAGE_KEYS.SYNC_ERROR,
    ]);
    document.getElementById("opt-last-sync").textContent = formatDate(
      data[STORAGE_KEYS.LAST_SYNC],
    );
  }

  document
    .getElementById("btn-sync-now")
    .addEventListener("click", async () => {
      const btn = document.getElementById("btn-sync-now");
      const statusEl = document.getElementById("opt-sync-status");

      btn.disabled = true;
      statusEl.textContent =
        chrome.i18n.getMessage("optionsSyncing") || "Syncing...";
      statusEl.className = "sync-status sync-status--loading";
      statusEl.hidden = false;

      try {
        await chrome.runtime.sendMessage({ type: MSG.SYNC_NOW });
        await loadSyncStatus();
        await renderRulesList();
        statusEl.textContent =
          chrome.i18n.getMessage("optionsSyncSuccess") || "Synced successfully";
        statusEl.className = "sync-status sync-status--success";
        setTimeout(() => {
          statusEl.hidden = true;
        }, 3000);
      } catch (err) {
        statusEl.textContent = "Error: " + err.message;
        statusEl.className = "sync-status sync-status--error";
      } finally {
        btn.disabled = false;
      }
    });

  // ── Експорт / Імпорт ────────────────────────────────────────────────────────

  document.getElementById("btn-export").addEventListener("click", async () => {
    const syncData = await chrome.storage.sync.get(null);
    const localData = await chrome.storage.local.get(null);

    const exportObj = {
      version: chrome.runtime.getManifest().version,
      exportedAt: new Date().toISOString(),
      sync: syncData,
      local: localData,
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `printAIchat-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(chrome.i18n.getMessage("optionsExported") || "Settings exported");
  });

  document.getElementById("btn-import").addEventListener("click", () => {
    document.getElementById("import-file").click();
  });

  document
    .getElementById("import-file")
    .addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (!parsed.sync || !parsed.version) {
          throw new Error("Invalid export file format");
        }

        await chrome.storage.sync.set(parsed.sync);
        if (parsed.local) {
          await chrome.storage.local.set(parsed.local);
        }

        await init();
        showToast(
          chrome.i18n.getMessage("optionsImported") || "Settings imported",
        );
      } catch (err) {
        showToast("Import error: " + err.message, 5000);
      }

      // Скинути input щоб можна було імпортувати той самий файл повторно
      e.target.value = "";
    });

  // ── Скидання до дефолту ─────────────────────────────────────────────────────

  document.getElementById("btn-reset").addEventListener("click", async () => {
    const confirmed = confirm(
      chrome.i18n.getMessage("optionsResetConfirm") ||
        "Reset all settings to defaults? This cannot be undone.",
    );
    if (!confirmed) return;

    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();

    // Надіслати повідомлення background щоб він відновив дефолти і синхронізувався
    await chrome.runtime.sendMessage({ type: MSG.SYNC_NOW });

    showToast(chrome.i18n.getMessage("optionsResetDone") || "Settings reset");
    setTimeout(() => location.reload(), 1500);
  });

  // ── Ініціалізація ────────────────────────────────────────────────────────────

  async function init() {
    applyI18n();
    renderVersion();
    await Promise.all([
      loadGeneralSettings(),
      renderDomainList(),
      renderRulesList(),
      loadCustomRules(),
      loadSyncStatus(),
    ]);
  }

  init().catch(console.error);
})();
