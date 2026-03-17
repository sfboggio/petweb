#!/usr/bin/env node
/**
 * generate-images-json.js
 * Reads ./fotos/, optionally converts HEIC→JPG (requires ImageMagick),
 * and writes images.json.
 * Run with: node generate-images-json.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FOTOS_DIR    = path.join(__dirname, 'fotos');
const OUTPUT_FILE  = path.join(__dirname, 'images.json');
const WEB_FORMATS  = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const HEIC_FORMATS = ['.heic', '.HEIC'];

// ── Try to convert HEIC files using ImageMagick ───────────────────────────────
function hasMagick() {
  try { execSync('magick -version', { stdio: 'ignore' }); return true; }
  catch { return false; }
}

function convertHeicFiles(dir) {
  const allFiles = fs.readdirSync(dir);
  const heicFiles = allFiles.filter(f =>
    HEIC_FORMATS.includes(path.extname(f))
  );

  if (heicFiles.length === 0) return;

  const magick = hasMagick();
  if (!magick) {
    console.warn(`⚠️  Found ${heicFiles.length} HEIC file(s) but ImageMagick is not installed.`);
    console.warn('   Install it from https://imagemagick.org or convert manually.');
    return;
  }

  for (const file of heicFiles) {
    const src  = path.join(dir, file);
    const dest = path.join(dir, path.basename(file, path.extname(file)) + '.jpg');
    try {
      execSync(`magick "${src}" "${dest}"`, { stdio: 'inherit' });
      fs.unlinkSync(src);
      console.log(`🔄 Converted: ${file} → ${path.basename(dest)}`);
    } catch (err) {
      console.warn(`⚠️  Could not convert ${file}: ${err.message}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
try {
  convertHeicFiles(FOTOS_DIR);

  const files = fs.readdirSync(FOTOS_DIR);
  const images = files
    .filter(f => WEB_FORMATS.includes(path.extname(f).toLowerCase()))
    .sort();

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(images, null, 2) + '\n');
  console.log(`✅ images.json updated with ${images.length} image(s):`);
  images.forEach(img => console.log(`   • ${img}`));
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
