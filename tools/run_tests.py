"""
Runs a test page in headless Edge and prints the result.

    py tools/run_tests.py                            # core logic (tools/test.html)
    py tools/run_tests.py tools/engine-test.html     # sync: two devices, pretend server
    py build.py && py tools/run_tests.py tools/smoke.html   # taps the built app, syncs two frames
    py tools/run_tests.py tools/firebase-check.html  # the real Firebase SDK (needs internet)

The browser is the only JavaScript engine on this machine, so the tests run
there: this script serves the repository on a spare port, has Edge load the
page with --dump-dom, and reads the summary back out of the HTML. Exit code 0
means every test passed. Ported from the Life Hub project.
"""
import html
import re
import socket
import subprocess
import sys
import tempfile
import threading
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from serve import Handler  # noqa: E402

BROWSERS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
]


def browser() -> str:
    for b in BROWSERS:
        if Path(b).exists():
            return b
    sys.exit("No Edge or Chrome found to run the tests in.")


class QuietServer(ThreadingHTTPServer):
    # The smoke test reloads its frames mid-download; the aborted connection
    # is expected and its traceback would bury the real result.
    def handle_error(self, request, client_address):
        if not isinstance(sys.exc_info()[1], (ConnectionAbortedError, ConnectionResetError)):
            super().handle_error(request, client_address)


class Silent(Handler):
    def log_message(self, fmt, *args):
        pass


def serve() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    server = QuietServer(("127.0.0.1", port), partial(Silent, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return port


def summary(dom: str):
    """(passed?, text) from either page style: <pre id="out"> or test.html's #sum."""
    m = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
    if m:
        text = html.unescape(m.group(1))
        return text.startswith("PASS"), text
    m = re.search(r'<div id="sum"[^>]*>(.*?)</div>', dom, re.S)
    if not m:
        return None, ""
    line = html.unescape(m.group(1)).strip()
    fails = re.findall(r'<div class="r fail">(.*?)</div>(?:<div class="why">(.*?)</div>)?', dom, re.S)
    text = line + "".join(
        f"\n✗ {html.unescape(name)}" + (f"\n    {html.unescape(why)}" if why else "") for name, why in fails)
    return bool(re.search(r"\b0 failed", line)), text


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")  # the Windows console defaults to cp1252
    page = sys.argv[1] if len(sys.argv) > 1 else "tools/test.html"
    port = serve()
    with tempfile.TemporaryDirectory() as profile:
        try:
            out = subprocess.run(
                [browser(), "--headless=new", "--disable-gpu", "--no-first-run",
                 f"--user-data-dir={profile}", "--virtual-time-budget=30000",
                 "--window-size=1200,1000", "--dump-dom", f"http://127.0.0.1:{port}/{page}"],
                capture_output=True, text=True, encoding="utf-8", timeout=180,
            ).stdout
        except subprocess.TimeoutExpired:
            print(f"FAIL {page} never finished (3 minutes). Open it in a browser to see where it stops.")
            return 1
    ok, text = summary(out)
    if ok is None:
        print("Could not read the test page. Raw output:\n" + out[:2000])
        return 2
    print(text)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
