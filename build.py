"""
Build: src/ -> dist/

Port of build.mjs. This machine has no Node toolchain, so this is the build
that actually runs here; see CLAUDE.md.

No bundler. Browsers load ES modules natively, so the build only needs to
copy files, fix two import paths, concatenate CSS, generate icons, and inject
the precache list + version into the service worker.

    py build.py
"""
import hashlib
import re
import shutil
import struct
import zlib
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

# ---- JS: preserve layout, rewrite app.js's two relative imports -------------
for f in sorted((SRC / "core").iterdir()):
    copy(f, DIST / "core" / f.name)
copy(SRC / "ui/views.js", DIST / "ui/views.js")

app = (SRC / "ui/app.js").read_text(encoding="utf-8")
app = re.sub(r"from '\.\./core/", "from './core/", app)
app = app.replace("from './views.js'", "from './ui/views.js'")
write(DIST / "app.js", app)

# ---- static assets ----------------------------------------------------------
for sub in ("data", "fonts"):
    for f in sorted((SRC / sub).iterdir()):
        copy(f, DIST / sub / f.name)
copy(SRC / "index.html", DIST / "index.html")
copy(SRC / "manifest.webmanifest", DIST / "manifest.webmanifest")
write(DIST / ".nojekyll", b"")  # GitHub Pages: don't run Jekyll


# ---- icons: flat PNGs in the Instrument palette ------------------------------
# Paper ground with the flag's red and blue, matching src/ui/base.css. These
# are the home-screen icon and the PWA splash, so a stale dark palette here
# shows up as a black tile next to a paper-white app.
def png(size: int) -> bytes:
    bg, signal, muted = (0xF4, 0xF2, 0xED), (0xC4, 0x27, 0x2F), (0x01, 0x51, 0x97)
    bar_y, bar_h = round(size * 0.46), round(size * 0.08)
    sub_y, sub_h = round(size * 0.60), round(size * 0.04)
    x0, x1 = round(size * 0.30), round(size * 0.70)
    x2 = round(size * 0.54)

    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter: none
        for x in range(size):
            if bar_y <= y < bar_y + bar_h and x0 <= x < x1:
                c = signal
            elif sub_y <= y < sub_y + sub_h and x0 <= x < x2:
                c = muted
            else:
                c = bg
            raw.extend(c)

    def chunk(kind: bytes, data: bytes) -> bytes:
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )


for s in (192, 512):
    write(DIST / "icons" / f"icon-{s}.png", png(s))

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
