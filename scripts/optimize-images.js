const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IMAGE_DIR = path.join(__dirname, '..', 'images');
const MAX_SIZE_BYTES = 100 * 1024; // 100KB

function walkDir(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

async function convertJpgToWebp(jpgPath) {
  const webpPath = jpgPath.replace(/\.jpe?g$/i, '.webp');
  let quality = 80;
  let buf;

  while (quality >= 40) {
    buf = await sharp(jpgPath).webp({ quality }).toBuffer();
    if (buf.length <= MAX_SIZE_BYTES) break;
    quality -= 10;
  }

  fs.writeFileSync(webpPath, buf);
  fs.unlinkSync(jpgPath);

  const relPath = path.relative(path.join(__dirname, '..'), jpgPath);
  const finalKB = (buf.length / 1024).toFixed(1);
  console.log(`  converted: ${relPath} → .webp (${finalKB} KB, quality ${quality})`);
}

async function compressWebp(webpPath) {
  const original = fs.statSync(webpPath).size;
  const srcBuf = fs.readFileSync(webpPath);
  const meta = await sharp(srcBuf).metadata();
  let quality = 75;
  let buf;
  let width = meta.width;

  // First try compression-only at full resolution
  while (quality >= 40) {
    buf = await sharp(srcBuf).webp({ quality }).toBuffer();
    if (buf.length <= MAX_SIZE_BYTES) break;
    quality -= 5;
  }

  // If still too large, progressively resize down
  if (buf.length > MAX_SIZE_BYTES) {
    const widthSteps = [1280, 1024, 800];
    for (const w of widthSteps) {
      if (meta.width <= w) continue;
      quality = 75;
      while (quality >= 40) {
        buf = await sharp(srcBuf).resize({ width: w, withoutEnlargement: true }).webp({ quality }).toBuffer();
        if (buf.length <= MAX_SIZE_BYTES) break;
        quality -= 5;
      }
      width = w;
      if (buf.length <= MAX_SIZE_BYTES) break;
    }
  }

  if (buf.length < original) {
    fs.writeFileSync(webpPath, buf);
    const relPath = path.relative(path.join(__dirname, '..'), webpPath);
    const beforeKB = (original / 1024).toFixed(1);
    const afterKB = (buf.length / 1024).toFixed(1);
    const resized = width !== meta.width ? ` resized to ${width}px` : '';
    console.log(`  compressed: ${relPath} (${beforeKB} KB → ${afterKB} KB, quality ${quality}${resized})`);
  }
}

async function main() {
  const allFiles = walkDir(IMAGE_DIR);

  const jpgFiles = allFiles.filter(f => /\.jpe?g$/i.test(f));
  const webpFiles = allFiles.filter(f => /\.webp$/i.test(f));

  const remainingJpgs = jpgFiles.filter(f => fs.existsSync(f));
  console.log(`\nFound ${remainingJpgs.length} JPG files to convert:`);
  for (const f of remainingJpgs) {
    await convertJpgToWebp(f);
  }

  const oversizedWebp = webpFiles.filter(f => fs.statSync(f).size > MAX_SIZE_BYTES);
  console.log(`\nFound ${oversizedWebp.length} WebP files over 100KB to compress:`);
  for (const f of oversizedWebp) {
    await compressWebp(f);
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
