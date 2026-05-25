import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'images', 'social');

const SHORTCODES = [
  'DS44Kt_jLMK', 'DT7NZ5EjBRQ', 'DLVIvFRMBcr', 'DVVEurwDPCz', 'DJZXI5JMBdi',
  'DIzd8-doI8v', 'DKCyhVDRKQP', 'DIv1xK3Ishh', 'DDR5ltPtogr', 'C0bvSDIJbBN',
  'C0RufVqpxw9', 'CuTxN-LplRy', 'C3ZYLV5JL-x', 'Ct8oMoTpmbk', 'CtwNg3ZAdJi',
  'Ctlw7uCAI9Q', 'CtYsVlYA_qc', 'CtRStMfgKGE', 'CtOZtUwgkne', 'CtLwLjhgKGl',
  'CsjTWScLBeZ', 'Cs6BeP8g7TV', 'CsGvQZeAmjB', 'CHc6tYopfLP', 'CmZZ-K4j7CY',
];

function get(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        get(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    req.on('error', (err) => { file.close(); fs.unlinkSync(dest); reject(err); });
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('download timeout')); });
  });
}

async function getThumbnailUrl(shortcode) {
  // Try Instagram oEmbed API (no auth required)
  const oembedUrl = `https://www.instagram.com/api/v1/oembed/?url=https://www.instagram.com/p/${shortcode}/&omitscript=true`;
  try {
    const res = await get(oembedUrl);
    if (res.status === 200) {
      const data = JSON.parse(res.body.toString());
      if (data.thumbnail_url) return data.thumbnail_url;
    }
  } catch (_) {}

  // Fallback: scrape og:image from the reel page
  const pageUrl = `https://www.instagram.com/p/${shortcode}/`;
  const res = await get(pageUrl);
  const html = res.body.toString();
  const match = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);
  if (match) return match[1].replace(/&amp;/g, '&');
  throw new Error(`Could not find thumbnail for ${shortcode}`);
}

async function processShortcode(shortcode) {
  const dest = path.join(OUTPUT_DIR, `${shortcode}.jpg`);
  if (fs.existsSync(dest)) {
    console.log(`  skip  ${shortcode} (already exists)`);
    return;
  }
  try {
    const thumbUrl = await getThumbnailUrl(shortcode);
    await downloadFile(thumbUrl, dest);
    console.log(`  ✓     ${shortcode}`);
  } catch (err) {
    console.error(`  ✗     ${shortcode}: ${err.message}`);
  }
}

console.log(`Downloading ${SHORTCODES.length} thumbnails to images/social/\n`);
for (const code of SHORTCODES) {
  await processShortcode(code);
}
console.log('\nDone.');
