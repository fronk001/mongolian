/**
 * Build: src/ -> dist/
 *
 * No bundler. Browsers load ES modules natively, so the build only needs to
 * copy files, fix two import paths, concatenate CSS, generate icons, and inject
 * the precache list + version into the service worker.
 *
 *   node build.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const SRC = 'src', DIST = 'dist';

/** Clear dist without failing on files the OS won't let us unlink. */
const rm = p => {
  if (!fs.existsSync(p)) return;
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const full = path.join(p, e.name);
    try { fs.rmSync(full, { recursive: true, force: true }); }
    catch { /* leave it; it will be overwritten */ }
  }
};
const mk = p => fs.mkdirSync(p, { recursive: true });
const cp = (a, b) => { mk(path.dirname(b)); fs.copyFileSync(a, b); };
const read = p => fs.readFileSync(p, 'utf8');
const write = (p, s) => { mk(path.dirname(p)); fs.writeFileSync(p, s); };

rm(DIST); mk(DIST);

// ---- CSS: one file, font faces first ---------------------------------------
const css = ['ui/fonts.css', 'ui/base.css', 'ui/grade.css']
  .map(f => read(path.join(SRC, f))).join('\n');
write(path.join(DIST, 'styles.css'), css);

// ---- JS: preserve layout, rewrite app.js's two relative imports -------------
for (const f of fs.readdirSync(path.join(SRC, 'core')))
  cp(path.join(SRC, 'core', f), path.join(DIST, 'core', f));
cp(path.join(SRC, 'ui/views.js'), path.join(DIST, 'ui/views.js'));

write(path.join(DIST, 'app.js'),
  read(path.join(SRC, 'ui/app.js'))
    .replace(/from '\.\.\/core\//g, "from './core/")
    .replace(/from '\.\/views\.js'/g, "from './ui/views.js'"));

// ---- static assets ----------------------------------------------------------
for (const f of fs.readdirSync(path.join(SRC, 'data')))
  cp(path.join(SRC, 'data', f), path.join(DIST, 'data', f));
for (const f of fs.readdirSync(path.join(SRC, 'fonts')))
  cp(path.join(SRC, 'fonts', f), path.join(DIST, 'fonts', f));
cp(path.join(SRC, 'index.html'), path.join(DIST, 'index.html'));
cp(path.join(SRC, 'manifest.webmanifest'), path.join(DIST, 'manifest.webmanifest'));
write(path.join(DIST, '.nojekyll'), '');   // GitHub Pages: don't run Jekyll

// ---- icons: flat PNGs in the Instrument palette ------------------------------
function png(size) {
  const bg = [0x0a, 0x0b, 0x0c], signal = [0xd8, 0xf0, 0x4b], muted = [0x7c, 0x82, 0x88];
  const rows = [];
  const barY = Math.round(size * 0.46), barH = Math.round(size * 0.08);
  const subY = Math.round(size * 0.60), subH = Math.round(size * 0.04);
  const x0 = Math.round(size * 0.30), x1 = Math.round(size * 0.70);
  const x2 = Math.round(size * 0.54);
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(size * 3 + 1);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      let c = bg;
      if (y >= barY && y < barY + barH && x >= x0 && x < x1) c = signal;
      else if (y >= subY && y < subY + subH && x >= x0 && x < x2) c = muted;
      row[1 + x * 3] = c[0]; row[2 + x * 3] = c[1]; row[3 + x * 3] = c[2];
    }
    rows.push(row);
  }
  const idat = zlib.deflateSync(Buffer.concat(rows), { level: 9 });
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))
  ]);
}
let CRC_T = null;
function crc32(buf) {
  if (!CRC_T) {
    CRC_T = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_T[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}
for (const s of [192, 512]) {
  mk(path.join(DIST, 'icons'));
  fs.writeFileSync(path.join(DIST, 'icons', `icon-${s}.png`), png(s));
}

// ---- service worker: precache list + content-hash version -------------------
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

const assets = walk(DIST)
  .map(p => './' + path.relative(DIST, p).split(path.sep).join('/'))
  .filter(p => !p.endsWith('.nojekyll'));

const version = crypto.createHash('sha1')
  .update(assets.map(a => fs.readFileSync(path.join(DIST, a))).join(''))
  .digest('hex').slice(0, 10);

write(path.join(DIST, 'sw.js'),
  read(path.join(SRC, 'sw.js'))
    .replaceAll('__ASSETS__', JSON.stringify(assets.concat(['./']), null, 2))
    .replaceAll('__VERSION__', version));

const bytes = walk(DIST).reduce((a, p) => a + fs.statSync(p).size, 0);
console.log(`built ${assets.length + 1} files, ${(bytes / 1024).toFixed(0)} KB, version ${version}`);
