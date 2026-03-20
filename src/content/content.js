// src/content/content.js

(function () {
  "use strict";

  // Уникаємо подвійного виконання (актуально для SPA з history navigation)
  if (window.__printAIchat_loaded) return;
  window.__printAIchat_loaded = true;

  const STORAGE_KEYS = {
    RULES: "gh_rules",
    CONFIG: "gh_config",
    CUSTOM_RULES: "custom_rules",
    ENABLED_GLOBAL: "enabled_global",
    DISABLED_DOMAINS: "disabled_domains",
  };

  // ── Головна точка входу ────────────────────────────────────────────────────

  async function init() {
    const storage = await chrome.storage.local.get([
      STORAGE_KEYS.RULES,
      STORAGE_KEYS.CONFIG,
    ]);
    const syncStorage = await chrome.storage.sync.get([
      STORAGE_KEYS.ENABLED_GLOBAL,
      STORAGE_KEYS.DISABLED_DOMAINS,
      STORAGE_KEYS.CUSTOM_RULES,
    ]);

    // Глобальне вимкнення
    if (!syncStorage[STORAGE_KEYS.ENABLED_GLOBAL]) return;

    // Вимкнення для поточного домену
    const currentDomain = window.location.hostname;
    const disabledDomains = syncStorage[STORAGE_KEYS.DISABLED_DOMAINS] || [];
    if (disabledDomains.includes(currentDomain)) return;

    const ghRules = storage[STORAGE_KEYS.RULES] || { rules: [] };
    const customRules = syncStorage[STORAGE_KEYS.CUSTOM_RULES] || [];

    // Об'єднати правила: спочатку GitHub, потім кастомні (кастомні мають пріоритет)
    const allRules = [...(ghRules.rules || []), ...customRules];

    if (allRules.length === 0) return;

    // Застосувати правила для поточного домену
    const applicableRules = allRules.filter((rule) =>
      matchesDomain(rule.domains, currentDomain),
    );

    if (applicableRules.length === 0) return;

    // Застосувати до поточного DOM
    applyRules(applicableRules);

    // Спостерігати за змінами DOM (SPA: React, Vue, Angular)
    observeDOM(applicableRules);
  }

  // ── Domain matching ────────────────────────────────────────────────────────

  /**
   * @param {string[]} domains - масив патернів: ["chat.openai.com", "*.claude.ai"]
   * @param {string} hostname
   */
  function matchesDomain(domains, hostname) {
    if (!domains || domains.includes("*")) return true;
    return domains.some((pattern) => {
      if (pattern.startsWith("*.")) {
        const base = pattern.slice(2);
        return hostname === base || hostname.endsWith(`.${base}`);
      }
      return hostname === pattern;
    });
  }

  // ── DOM маніпуляції ────────────────────────────────────────────────────────

  function applyRules(rules) {
    rules.forEach((rule) => {
      if (rule.disabled) return;
      try {
        switch (rule.action) {
          case "hide":
            actionHide(rule);
            break;
          case "replace":
            actionReplace(rule);
            break;
          case "addClass":
            actionAddClass(rule);
            break;
          case "remove":
            actionRemove(rule);
            break;
          case "inject":
            actionInject(rule);
            break;
          default:
            console.warn("[printAIchat] Unknown action:", rule.action);
        }
      } catch (err) {
        console.error("[printAIchat] Rule error:", rule, err);
      }
    });
  }

  /**
   * Сховати елементи (display: none через CSS клас)
   * rule: { action: "hide", selector: ".some-class" }
   */
  function actionHide(rule) {
    document.querySelectorAll(rule.selector).forEach((el) => {
      el.classList.add("printaichat-hidden");
    });
  }

  /**
   * Видалити елементи з DOM повністю
   * rule: { action: "remove", selector: ".ads-banner" }
   */
  function actionRemove(rule) {
    document.querySelectorAll(rule.selector).forEach((el) => el.remove());
  }

  /**
   * Замінити текстовий вміст елемента
   * rule: { action: "replace", selector: "h1.title", value: "New Title" }
   */
  function actionReplace(rule) {
    document.querySelectorAll(rule.selector).forEach((el) => {
      if (rule.attribute) {
        el.setAttribute(rule.attribute, rule.value);
      } else {
        // textContent безпечніший ніж innerHTML
        el.textContent = rule.value;
      }
    });
  }

  /**
   * Додати CSS клас до елементів
   * rule: { action: "addClass", selector: ".chat-container", value: "print-friendly" }
   */
  function actionAddClass(rule) {
    const classes = rule.value.split(" ").filter(Boolean);
    document.querySelectorAll(rule.selector).forEach((el) => {
      el.classList.add(...classes);
    });
  }

  /**
   * Інжектувати CSS або JS рядок на сторінку
   * rule: { action: "inject", type: "css", value: "body { font-size: 14px; }" }
   * rule: { action: "inject", type: "js",  value: "console.log('injected')" }
   */
  function actionInject(rule) {
    if (rule.type === "css") {
      const style = document.createElement("style");
      style.setAttribute("data-printaichat", "injected");
      // Безпека: CSS не може виконувати JS (на відміну від innerHTML)
      style.textContent = rule.value;
      document.head.appendChild(style);
    } else if (rule.type === "js") {
      // ⚠️ JS інжекція — потребує дозволу у manifest і обережності
      // Не використовуємо eval() — Chrome Web Store відхиляє
      const script = document.createElement("script");
      script.setAttribute("data-printaichat", "injected");
      script.textContent = rule.value;
      document.head.appendChild(script);
      // Видалити після виконання
      script.remove();
    }
  }

  // ── MutationObserver для SPA ───────────────────────────────────────────────

  let observerDebounceTimer = null;

  function observeDOM(rules) {
    const observer = new MutationObserver((_mutations) => {
      // Дебаунс: не запускати на кожну мікро-зміну
      clearTimeout(observerDebounceTimer);
      observerDebounceTimer = setTimeout(() => {
        applyRules(rules);
      }, 300);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ── Старт ─────────────────────────────────────────────────────────────────

  // document_idle: DOM готовий, але чекаємо ще на storage
  init().catch((err) => {
    console.error("[printAIchat] Init error:", err);
  });
})();
