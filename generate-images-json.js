#!/usr/bin/env node
/**
 * generate-images-json.js
 * Reads ./fotos/ and writes images.json with all supported image filenames.
 * Run with: node generate-images-json.js
 */

const fs = require('fs');
const path = require('path');

const FOTOS_DIR = path.join(__dirname, 'fotos');
const OUTPUT_FILE = path.join(__dirname, 'images.json');
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

try {
  const files = fs.readdirSync(FOTOS_DIR);
  const images = files
    .filter(f => SUPPORTED_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .sort();

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(images, null, 2) + '\n');
  console.log(`✅ images.json updated with ${images.length} image(s):`);
  images.forEach(img => console.log(`   • ${img}`));
} catch (err) {
  console.error('❌ Error generating images.json:', err.message);
  process.exit(1);
}
