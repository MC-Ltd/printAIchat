// scripts/generate-icons.js
import sharp from "sharp";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SVG_PATH = join(ROOT, "src/assets/icons/icon.svg");
const OUT_DIR = join(ROOT, "src/assets/icons");
const SIZES = [16, 32, 48, 128];

async function generateIcons() {
  if (!existsSync(SVG_PATH)) {
    console.error("[icons] ERROR: src/assets/icons/icon.svg not found");
    console.error("[icons] Create an SVG file first, then run: npm run icons");
    process.exit(1);
  }

  const svgBuffer = readFileSync(SVG_PATH);
  console.log("[icons] Generating icons from icon.svg...");

  for (const size of SIZES) {
    const outPath = join(OUT_DIR, `icon-${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outPath);
    console.log(`[icons] ✓ icon-${size}.png`);
  }

  console.log("[icons] Done.");
}

generateIcons().catch((err) => {
  console.error("[icons] Failed:", err.message);
  process.exit(1);
});
