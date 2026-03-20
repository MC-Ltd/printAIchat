// eslint.config.js
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.js", "scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        // ── Browser globals ───────────────────────────────────────────
        window: "readonly",
        document: "readonly",
        console: "readonly",
        navigator: "readonly",
        location: "readonly",
        history: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Event: "readonly",
        CustomEvent: "readonly",
        // DOM APIs
        MutationObserver: "readonly",
        IntersectionObserver: "readonly",
        ResizeObserver: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        // Web APIs
        Blob: "readonly",
        File: "readonly",
        FileReader: "readonly",
        FormData: "readonly",
        XMLHttpRequest: "readonly",
        confirm: "readonly",
        alert: "readonly",
        prompt: "readonly",
        // Storage
        localStorage: "readonly",
        sessionStorage: "readonly",
        // ── Chrome Extension API ──────────────────────────────────────
        chrome: "readonly",
        // ── Node.js globals (для scripts/) ───────────────────────────
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          // Ігнорувати параметри що починаються з _ (наприклад _mutations)
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-console": "off",
    },
  },
];

// // eslint.config.js
// import js from "@eslint/js";

// export default [
//   js.configs.recommended,
//   {
//     files: ["src/**/*.js", "scripts/**/*.js"],
//     languageOptions: {
//       ecmaVersion: 2020,
//       sourceType: "module",
//       globals: {
//         // Browser globals (для content/popup/options)
//         window: "readonly",
//         document: "readonly",
//         console: "readonly",
//         setTimeout: "readonly",
//         clearTimeout: "readonly",
//         fetch: "readonly",
//         URL: "readonly",
//         // Chrome Extension API
//         chrome: "readonly",
//         // Node.js globals (для scripts/)
//         process: "readonly",
//       },
//     },
//     rules: {
//       "no-unused-vars": "warn",
//       "no-console": "off",
//     },
//   },
// ];

// export default [
//   {
//     languageOptions: {
//       ecmaVersion: 2020,
//       sourceType: 'script', // розширення не використовують ES modules напряму
//       globals: {
//         // Browser extension globals
//         chrome: 'readonly',
//         browser: 'readonly', // Firefox WebExtensions API
//         // Web APIs
//         window: 'readonly',
//         document: 'readonly',
//         console: 'readonly',
//         fetch: 'readonly',
//         setTimeout: 'readonly',
//         clearTimeout: 'readonly',
//         setInterval: 'readonly',
//         clearInterval: 'readonly',і
//         MutationObserver: 'readonly',
//         URL: 'readonly',
//         URLSearchParams: 'readonly',
//       },
//     },
//     rules: {
//       'no-unused-vars': 'warn',
//       'no-console': 'off', // у розширеннях console.log для дебагу — норма
//       'prefer-const': 'error',
//       'no-var': 'error',
//       eqeqeq: ['error', 'always'],
//       'no-eval': 'error', // Chrome Web Store відхиляє розширення з eval()
//       'no-implied-eval': 'error',
//     },
//     files: ['src/**/*.js', 'scripts/**/*.js'],
//   },
// ];
