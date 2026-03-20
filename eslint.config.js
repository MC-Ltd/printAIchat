export default [
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script', // розширення не використовують ES modules напряму
      globals: {
        // Browser extension globals
        chrome: 'readonly',
        browser: 'readonly', // Firefox WebExtensions API
        // Web APIs
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        MutationObserver: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off', // у розширеннях console.log для дебагу — норма
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      'no-eval': 'error', // Chrome Web Store відхиляє розширення з eval()
      'no-implied-eval': 'error',
    },
    files: ['src/**/*.js', 'scripts/**/*.js'],
  },
];