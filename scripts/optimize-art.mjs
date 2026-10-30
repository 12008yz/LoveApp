/**
 * Re-encode public/art JPGs + emit WebP siblings for faster loads.
 * Run: node scripts/optimize-art.mjs
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ART = path.resolve("public/art");

/** @type {Record<string, { maxEdge: number; jpegQ: number; webpQ: number }>} */
const PRESETS = {
  "wallpaper-chat-tile.jpg": { maxEdge: 512, jpegQ: 72, webpQ: 68 },
  "wallpaper-diary.jpg": { maxEdge: 512, jpegQ: 72, webpQ: 68 },
  "home-room.jpg": { maxEdge: 864, jpegQ: 78, webpQ: 72 },
  "landing-room.jpg": { maxEdge: 864, jpegQ: 78, webpQ: 72 },
  "auth-window.jpg": { maxEdge: 864, jpegQ: 78, webpQ: 72 },
  "waiting-seat.jpg": { maxEdge: 864, jpegQ: 78, webpQ: 72 },
};

async function optimizeOne(file, preset) {
  const src = path.join(ART, file);
  const base = file.replace(/\.jpe?g$/i, "");
  const webpOut = path.join(ART, `${base}.webp`);
  const before = (await stat(src)).size;
  const input = await readFile(src);

  const meta = await sharp(input).metadata();
  const w = meta.width ?? preset.maxEdge;
  const h = meta.height ?? preset.maxEdge;
  const long = Math.max(w, h);

  let pipeline = sharp(input).rotate();
  if (long > preset.maxEdge) {
    pipeline = pipeline.resize({
      width: w >= h ? preset.maxEdge : undefined,
      height: h > w ? preset.maxEdge : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const [jpegBuf, webpBuf] = await Promise.all([
    pipeline.clone().jpeg({ quality: preset.jpegQ, mozjpeg: true }).toBuffer(),
    pipeline.clone().webp({ quality: preset.webpQ, effort: 6 }).toBuffer(),
  ]);

  await writeFile(src, jpegBuf);
  await writeFile(webpOut, webpBuf);

  const afterJpg = (await stat(src)).size;
  const afterWebp = (await stat(webpOut)).size;
  console.log(
    `${file}: ${(before / 1024).toFixed(0)}KB → jpg ${(afterJpg / 1024).toFixed(0)}KB, webp ${(afterWebp / 1024).toFixed(0)}KB`,
  );
}

const files = await readdir(ART);
for (const file of files) {
  const preset = PRESETS[file];
  if (!preset) continue;
  await optimizeOne(file, preset);
}

console.log("done");
