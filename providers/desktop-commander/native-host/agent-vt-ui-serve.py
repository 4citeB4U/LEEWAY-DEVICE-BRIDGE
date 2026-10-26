"""REGION: LEEWAY.UI.PC; TAG: PINNED_AGENT_VT_FRONTEND_ADAPTER
WHO: Agent Lee native UI. WHAT: Serve the existing approved standalone VT HTML.
WHERE: Owner loopback only. WHEN: UI startup. WHY: Restore missing UI route.
HOW: SHA-256-admitted exact HTML bytes with a single allowlisted GET route.
LICENSE: MIT. No VT executor, runtime, or backend is implemented here.
"""
import argparse
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--source", required=True)
parser.add_argument("--sha256", required=True)
args = parser.parse_args()
source = Path(args.source).resolve()
payload = source.read_bytes()
actual = hashlib.sha256(payload).hexdigest()
if actual.lower() != args.sha256.lower():
    raise SystemExit("PINNED_AGENT_VT_FRONTEND_HASH_MISMATCH")

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/agent-vt-embedded/standalone.html":
            self.send_error(404, "UI route not found")
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, fmt, *values):
        pass

server = ThreadingHTTPServer(("127.0.0.1", 4173), Handler)
print("PINNED_AGENT_VT_UI_SERVING sha256=" + actual + " port=4173", flush=True)
server.serve_forever()
