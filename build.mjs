/**
 * Build: src/ -> dist/
 *
 * No bundler. Browsers load ES modules natively, so the build only needs to
 * copy files, fix two import paths, concatenate CSS, and inject
 * the precache list + version into the service worker.
 *
 *   node build.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
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
for (const f of fs.readdirSync(path.join(SRC, 'icons')))   // finished artwork, copied as is
  cp(path.join(SRC, 'icons', f), path.join(DIST, 'icons', f));
write(path.join(DIST, '.nojekyll'), '');   // GitHub Pages: don't run Jekyll

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
