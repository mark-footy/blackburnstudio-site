// One-shot image compression for repo-tracked photo assets.
// Re-encodes every JPEG in the configured folders in place:
//   - long-edge max 2400px
//   - mozjpeg q82 progressive
//   - metadata stripped
//
// Run: node scripts/compress-images.mjs

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const FOLDERS = ["public/portraits", "public/families", "public/couples", "public/japan", "public/images"];
const MAX_EDGE = 2400;
const QUALITY = 82;

function fmt(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

async function processFile(file) {
  const before = (await fs.stat(file)).size;
  const buffer = await fs.readFile(file);
  const out = await sharp(buffer)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
    .toBuffer();
  if (out.length < before) {
    await fs.writeFile(file, out);
    return { file, before, after: out.length, changed: true };
  }
  return { file, before, after: before, changed: false };
}

async function walk(folder) {
  const abs = path.join(process.cwd(), folder);
  let entries;
  try {
    entries = await fs.readdir(abs, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const e of entries) {
    if (e.isDirectory()) continue;
    if (!/\.jpe?g$/i.test(e.name)) continue;
    files.push(path.join(abs, e.name));
  }
  return files;
}

const start = Date.now();
let totalBefore = 0;
let totalAfter = 0;
let touched = 0;

for (const folder of FOLDERS) {
  const files = await walk(folder);
  if (!files.length) {
    console.log(`(skip) ${folder} — no jpegs`);
    continue;
  }
  console.log(`\n${folder} (${files.length} files)`);
  for (const f of files) {
    const r = await processFile(f);
    totalBefore += r.before;
    totalAfter += r.after;
    if (r.changed) touched++;
    const name = path.basename(r.file);
    const tag = r.changed ? "✓" : "·";
    console.log(`  ${tag} ${name.padEnd(42)} ${fmt(r.before).padStart(9)} → ${fmt(r.after).padStart(9)}`);
  }
}

console.log(
  `\nDone in ${((Date.now() - start) / 1000).toFixed(1)}s. ` +
    `Total ${fmt(totalBefore)} → ${fmt(totalAfter)} ` +
    `(${touched} files re-encoded, saved ${fmt(totalBefore - totalAfter)}).`,
);
