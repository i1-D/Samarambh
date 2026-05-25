import sharp from 'sharp';
import { readdir, unlink, rename, stat } from 'fs/promises';
import { join, extname, basename, dirname } from 'path';

const GALLERY_DIR = 'images/gallery';
const MAX_SIZE_BYTES = 100 * 1024; // 100KB

async function findJpgs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const jpgs = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      jpgs.push(...await findJpgs(full));
    } else if (/\.(jpg|jpeg)$/i.test(entry.name)) {
      jpgs.push(full);
    }
  }
  return jpgs;
}

async function convertToWebP(jpgPath) {
  const dir = dirname(jpgPath);
  const base = basename(jpgPath, extname(jpgPath));
  const webpPath = join(dir, base + '.webp');
  const origStat = await stat(jpgPath);

  const meta = await sharp(jpgPath).metadata();
  const origWidth = meta.width;
  let buf;
  let quality = 80;
  let outputSize = Infinity;

  // Try quality steps at progressively smaller sizes until under 100KB
  const maxWidths = [undefined, 1920, 1280, 960, 640];
  outer: for (const maxW of maxWidths) {
    const resizeOpts = maxW ? { width: maxW, withoutEnlargement: true } : undefined;
    quality = 80;
    while (quality >= 10) {
      const pipeline = resizeOpts ? sharp(jpgPath).resize(resizeOpts) : sharp(jpgPath);
      buf = await pipeline.webp({ quality }).toBuffer();
      outputSize = buf.length;
      if (outputSize <= MAX_SIZE_BYTES) break outer;
      quality -= 5;
    }
  }
  // Record the quality actually used (last successful attempt)
  if (quality < 10) quality = 10;

  const { writeFile } = await import('fs/promises');
  await writeFile(webpPath, buf);
  await unlink(jpgPath);

  return {
    from: jpgPath,
    to: webpPath,
    origKB: Math.round(origStat.size / 1024),
    outKB: Math.round(outputSize / 1024),
    quality,
  };
}

async function renameTentFiles(tentDir) {
  const entries = await readdir(tentDir, { withFileTypes: true });
  const webps = entries
    .filter(e => e.isFile() && e.name.endsWith('.webp'))
    .map(e => e.name)
    .sort();

  const renames = [];
  for (let i = 0; i < webps.length; i++) {
    const oldName = webps[i];
    const newName = `${i + 1}.webp`;
    if (oldName !== newName) {
      await rename(join(tentDir, oldName), join(tentDir, newName));
      renames.push(`  ${oldName} → ${newName}`);
    }
  }
  return renames;
}

async function main() {
  const jpgs = await findJpgs(GALLERY_DIR);
  console.log(`Found ${jpgs.length} JPG files to convert.\n`);

  const results = [];
  for (const jpg of jpgs) {
    process.stdout.write(`Converting ${jpg} ... `);
    const r = await convertToWebP(jpg);
    const flag = r.outKB >= 100 ? ' ⚠ OVER 100KB' : '';
    console.log(`${r.origKB}KB → ${r.outKB}KB (q${r.quality})${flag}`);
    results.push(r);
  }

  const tentDir = join(GALLERY_DIR, 'tent');
  console.log('\nRenaming tent/ files to sequential numbers...');
  const renames = await renameTentFiles(tentDir);
  if (renames.length) {
    renames.forEach(r => console.log(r));
  } else {
    console.log('  (no renames needed)');
  }

  const over = results.filter(r => r.outKB >= 100);
  console.log(`\nDone. ${results.length} converted, ${over.length} over 100KB.`);
  if (over.length) {
    console.log('Files still over 100KB:');
    over.forEach(r => console.log(`  ${r.to} — ${r.outKB}KB`));
  }
}

main().catch(err => { console.error(err); process.exit(1); });
