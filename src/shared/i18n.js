// src/shared/i18n.js

/**
 * Хелпер для chrome.i18n.getMessage().
 * Використовується у JS файлах.
 *
 * @param {string} key   - ключ із messages.json
 * @param {string|string[]} [substitutions] - підстановки ($1, $2...)
 * @returns {string}
 */
function t(key, substitutions) {
  const message = chrome.i18n.getMessage(key, substitutions);
  if (!message) {
    console.warn(`[printAIchat] Missing i18n key: "${key}"`);
    return key; // fallback — повертаємо сам ключ
  }
  return message;
}
