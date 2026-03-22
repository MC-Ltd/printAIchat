# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2025-06-15

### Fixed

- Виправлено відображення повідомлень ChatGPT при включеному темному режимі (#12)
- Виправлено помилку парсингу для Claude.ai після оновлення їхнього UI (#15)

### Changed

- Оновлено правила для Gemini Advanced

### Added

- Підтримка нового сайту Grok (x.ai/grok)

[1.0.1]: https://github.com/MC-Ltd/printAIchat/compare/v1.0.0...v1.0.1

## [1.0.0] - 2026-03-20

### Added

- Chrome/Edge MV3 manifest
- Background service worker with GitHub sync
- Content script with DOM rules engine (hide/remove/replace/addClass/inject)
- Popup with global/site toggle and sync button
- Options page with custom rules, export/import, domain management
- i18n support: English, Ukrainian
- Rules sync from printAIchat-data repository
- Daily auto-sync via chrome.alarms
- MutationObserver for SPA sites

[Unreleased]: https://github.com/YOUR_USERNAME/printAIchat/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/YOUR_USERNAME/printAIchat/releases/tag/v1.0.0
