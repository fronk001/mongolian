"""
Dev server. Replaces `npx serve` — this machine has no Node.

    py tools/serve.py           # repo root on :8000  (tests: /tools/test.html)
    py tools/serve.py dist      # the built app
    py tools/serve.py dist 8080

Sends Cache-Control: no-store on everything. Without it the browser keeps
serving stale ES modules after an edit, so a test run can quietly pass against
code that is no longer on disk.

Also fixes up MIME types Python does not know, which otherwise break the PWA
locally: a wrong Content-Type on the manifest or the woff2 fonts is enough.
"""
import sys
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

EXTRA_TYPES = {
    ".webmanifest": "application/manifest+json",
    ".woff2": "font/woff2",
    ".mjs": "text/javascript",
    ".js": "text/javascript",
    ".json": "application/json",
}


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, **EXTRA_TYPES}

    def do_GET(self):
        # /__wait answers after 0.2 s. Headless Edge fast-forwards its clock
        # whenever no request is open, so a test page that must wait in real
        # time (tools/firebase-check.html) keeps one of these open meanwhile.
        if self.path.startswith("/__wait"):
            time.sleep(0.2)
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        # A stale service worker from an earlier build would otherwise keep
        # serving its own precached copies straight past this server.
        self.send_header("Service-Worker-Allowed", "/")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s\n" % (fmt % args))
        sys.stderr.flush()


def main() -> None:
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
    handler = partial(Handler, directory=root)
    print(f"serving {root!r} on http://localhost:{port}  (no-store)", flush=True)
    if root == ".":
        print(f"tests: http://localhost:{port}/tools/test.html", flush=True)
    try:
        # Threading matters: a browser opens several parallel connections for
        # the module graph, and a single-threaded server deadlocks on them.
        ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
    except KeyboardInterrupt:
        print("\nstopped", flush=True)


if __name__ == "__main__":
    main()
