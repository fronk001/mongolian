"""
Build: src/ -> dist/

Port of build.mjs. This machine has no Node toolchain, so this is the build
that actually runs here; see CLAUDE.md.

No bundler. Browsers load ES modules natively, so the build only needs to
copy files, fix app.js's import paths, concatenate CSS, and
inject the precache list + version into the service worker.

    py build.py
"""
import hashlib
import re
import shutil
from pathlib import Path

SRC = Path("src")
DIST = Path("dist")

# sw.js is written last and must never precache itself; .nojekyll is a GitHub
# Pages marker, not an asset. Both are excluded from the manifest by name so
# the manifest does not depend on what a previous build left behind.
NOT_PRECACHED = {"sw.js", ".nojekyll"}


def clear(p: Path) -> None:
    """Clear dist without failing on files the OS won't let us unlink."""
    if not p.exists():
        return
    for entry in p.iterdir():
        try:
            shutil.rmtree(entry) if entry.is_dir() else entry.unlink()
        except OSError:
            pass  # leave it; it will be overwritten


def write(p: Path, data) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data if isinstance(data, bytes) else data.encode("utf-8"))


def copy(a: Path, b: Path) -> None:
    b.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(a, b)


clear(DIST)
DIST.mkdir(parents=True, exist_ok=True)

# ---- CSS: one file, font faces first ---------------------------------------
css = "\n".join(
    (SRC / f).read_text(encoding="utf-8")
    for f in ("ui/fonts.css", "ui/base.css", "ui/grade.css")
)
write(DIST / "styles.css", css)

# ---- JS: preserve layout, rewrite app.js's relative imports -----------------
# app.js moves up a level (src/ui/app.js -> dist/app.js), so its paths into
# core/, sync/ and ui/ change; every other module keeps its place.
for sub in ("core", "sync"):
    for f in sorted((SRC / sub).iterdir()):
        copy(f, DIST / sub / f.name)
# Every ui module but app.js. A list of names here once meant a new module was
# silently missing from dist/, and the built app opened blank.
UI_MODULES = sorted(f.name for f in (SRC / "ui").glob("*.js") if f.name != "app.js")
for name in UI_MODULES:
    copy(SRC / "ui" / name, DIST / "ui" / name)

app = (SRC / "ui/app.js").read_text(encoding="utf-8")
app = re.sub(r"'\.\./(core|sync)/", r"'./\1/", app)  # static and dynamic imports alike
app = re.sub(r"from '\./([\w-]+)\.js'", r"from './ui/\1.js'", app)
write(DIST / "app.js", app)

# ---- every relative import must resolve --------------------------------------
# A module that is imported but not copied loads nowhere and paints nothing, with
# no error until a phone opens the app. Fail the build instead.
IMPORT = re.compile(r"""(?:from\s+|import\s*\(\s*)['"](\.{1,2}/[^'"]+)['"]""")
missing = []
for js in DIST.rglob("*.js"):
    for target in IMPORT.findall(js.read_text(encoding="utf-8")):
        if not (js.parent / target).resolve().is_file():
            missing.append(f"{js.relative_to(DIST).as_posix()} -> {target}")
if missing:
    raise SystemExit("unresolved imports in dist/:\n  " + "\n  ".join(missing))

# ---- static assets ----------------------------------------------------------
# icons/ is the finished home-screen artwork (src/icons/): drawn once, outside the
# build, and copied as is. The build no longer paints them.
for sub in ("data", "fonts", "icons"):
    for f in sorted((SRC / sub).iterdir()):
        copy(f, DIST / sub / f.name)
copy(SRC / "index.html", DIST / "index.html")
copy(SRC / "manifest.webmanifest", DIST / "manifest.webmanifest")
write(DIST / ".nojekyll", b"")  # GitHub Pages: don't run Jekyll

# ---- service worker: precache list + content-hash version -------------------
# Sorted so the manifest and the version hash are reproducible.
assets = sorted(
    "./" + p.relative_to(DIST).as_posix()
    for p in DIST.rglob("*")
    if p.is_file() and p.name not in NOT_PRECACHED
)

# Hash the raw bytes. build.mjs joined Buffers into a string, which utf8-decodes
# binary assets and can collide on font/icon changes.
digest = hashlib.sha1()
for a in assets:
    digest.update((DIST / a[2:]).read_bytes())
version = digest.hexdigest()[:10]

manifest = "[\n" + ",\n".join(f'  "{a}"' for a in assets + ["./"]) + "\n]"
sw = (SRC / "sw.js").read_text(encoding="utf-8")
write(DIST / "sw.js", sw.replace("__ASSETS__", manifest).replace("__VERSION__", version))

total = sum(p.stat().st_size for p in DIST.rglob("*") if p.is_file())
print(f"built {len(assets) + 1} files, {total / 1024:.0f} KB, version {version}")
