# printAIchat

Browser extension that modifies AI chat page markup for clean printing and export.

## Features

- 🖨️ Clean print layout for AI chat conversations
- 🔄 Rules sync from GitHub (no extension update needed)
- 🌍 Multilingual: English, Ukrainian
- ⚙️ Per-domain enable/disable
- 🔒 No data collection, no external servers

## Supported Browsers

| Browser | Status | Manifest |
|---------|--------|----------|
| Chrome  | ✅ Stable | MV3 |
| Edge    | ✅ Stable | MV3 |
| Firefox | 🔜 Planned | MV2 |
| Opera   | 🔜 Planned | MV3 |

## Development

### Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0

### Setup
```bash
git clone https://github.com/YOUR_USERNAME/printAIchat.git
cd printAIchat
npm install
```

### Build
```bash
npm run build:chrome    # Build for Chrome/Edge
npm run build           # Build all browsers
npm run zip             # Build + create .zip archives
```

### Load in Browser (Development)

**Chrome/Edge:**
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select `dist/chrome/`

**Firefox:**
1. Open `about:debugging`
2. Click "This Firefox" → "Load Temporary Add-on"
3. Select `dist/firefox/manifest.json`

## Data Repository

Rules, patches, and locales are loaded from a separate public repository:
👉 [printAIchat-data](https://github.com/YOUR_USERNAME/printAIchat-data)

## License

MIT