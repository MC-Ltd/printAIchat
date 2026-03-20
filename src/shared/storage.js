// src/shared/storage.js

/**
 * Обгортка над chrome.storage з єдиним інтерфейсом для local і sync.
 * Всі методи повертають Promise.
 */

export const storage = {
  /**
   * Зберегти одне або кілька значень
   * @param {'local'|'sync'} area
   * @param {Object} items
   */
  set(area, items) {
    return chrome.storage[area].set(items);
  },

  /**
   * Отримати одне або кілька значень
   * @param {'local'|'sync'} area
   * @param {string|string[]|Object} keys
   */
  get(area, keys) {
    return chrome.storage[area].get(keys);
  },

  /**
   * Видалити ключі
   * @param {'local'|'sync'} area
   * @param {string|string[]} keys
   */
  remove(area, keys) {
    return chrome.storage[area].remove(keys);
  },

  /**
   * Зручні методи для local (кеш GitHub)
   */
  local: {
    set: (items) => chrome.storage.local.set(items),
    get: (keys) => chrome.storage.local.get(keys),
    remove: (keys) => chrome.storage.local.remove(keys),
  },

  /**
   * Зручні методи для sync (налаштування користувача)
   */
  sync: {
    set: (items) => chrome.storage.sync.set(items),
    get: (keys) => chrome.storage.sync.get(keys),
    remove: (keys) => chrome.storage.sync.remove(keys),
  },
};
