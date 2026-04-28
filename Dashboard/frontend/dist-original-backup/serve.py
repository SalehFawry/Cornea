"""Minimal static file server + reverse proxy for /api/v1/.

Serves the Vite dist/ folder on port 3063 and proxies any request
starting with /api/v1/ to the FastAPI backend on the host machine.
No external dependencies — uses only the Python standard library.
"""

import http.server
import os
import urllib.request
import urllib.error

BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")
PORT = int(os.environ.get("PORT", "3063"))


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/") or self.path.startswith("/health") or self.path.startswith("/ready") or self.path.startswith("/metrics"):
            self._proxy()
        else:
            super().do_GET()

    def do_POST(self):
        self._proxy()

    def do_PUT(self):
        self._proxy()

    def do_DELETE(self):
        self._proxy()

    def do_OPTIONS(self):
        if self.path.startswith("/api/"):
            self._proxy()
        else:
            super().do_GET()

    def _proxy(self):
        target = BACKEND_URL.rstrip("/") + self.path
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        headers = {}
        for key in ("Content-Type", "X-API-Key", "Accept", "Authorization"):
            val = self.headers.get(key)
            if val:
                headers[key] = val

        req = urllib.request.Request(target, data=body, headers=headers, method=self.command)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                resp_body = resp.read()
                self.send_response(resp.status)
                for key, val in resp.getheaders():
                    if key.lower() not in ("transfer-encoding", "connection"):
                        self.send_header(key, val)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
                self.end_headers()
                self.wfile.write(resp_body)
        except urllib.error.HTTPError as e:
            resp_body = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(resp_body)
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(f'{{"error":"Backend unreachable","detail":"{e}"}}'.encode())


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Serving dist/ on :{PORT}, proxying /api/* → {BACKEND_URL}")
    server.serve_forever()
