#!/usr/bin/env python3
"""Local HTTP server for Energy Dashboard - serves static files AND proxies /api/v1/ to backend.

Workspace rule: HTTP clients use HTTP/1.0 explicitly.
"""
import http.server
import socketserver
import os
import sys
import urllib.parse
import http.client

PORT = 8765
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Backend API target (matches frontend/nginx.conf's reverse proxy target)
BACKEND_HOST = os.environ.get("BACKEND_HOST", "10.100.55.98")
BACKEND_PORT = int(os.environ.get("BACKEND_PORT", "8000"))

# API key — same value baked into the production frontend bundle (.env.production).
# Override via env if needed: BACKEND_API_KEY=...
BACKEND_API_KEY = os.environ.get(
    "BACKEND_API_KEY", "Nas2Al_allah_Elkhalas@fawry"
)


class Handler(http.server.SimpleHTTPRequestHandler):
    server_version = "EnergyDashboardLocal/1.0"
    protocol_version = "HTTP/1.0"  # Workspace rule: HTTP/1.0 only

    # ---------- static file serving ----------
    def translate_path(self, path):
        # Strip query parameters
        if "?" in path:
            path = path.split("?", 1)[0]
        path = path.lstrip("/")
        return os.path.join(DIRECTORY, path)

    def end_headers(self):
        # Disable caching for development
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        # CORS for any local clients
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header(
            "Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE"
        )
        self.send_header(
            "Access-Control-Allow-Headers", "Content-Type, X-API-KEY, Accept"
        )
        super().end_headers()

    # ---------- proxy /api/v1/* to backend ----------
    def _proxy_request(self, method):
        try:
            # http.client uses HTTP/1.1 by default. We force HTTP/1.0 by
            # using an HTTPConnection and overriding the request line via
            # the lower-level connection request.
            # http.client.HTTPConnection sets _http_vsn_str = HTTP/1.1; we monkey-patch.
            conn = http.client.HTTPConnection(BACKEND_HOST, BACKEND_PORT, timeout=30)
            conn._http_vsn = 10
            conn._http_vsn_str = "HTTP/1.0"

            # Read body if any
            length = int(self.headers.get("Content-Length") or 0)
            body = self.rfile.read(length) if length > 0 else None

            # Forward most headers (except hop-by-hop)
            hop_by_hop = {
                "connection",
                "keep-alive",
                "proxy-authenticate",
                "proxy-authorization",
                "te",
                "trailers",
                "transfer-encoding",
                "upgrade",
                "host",
                "content-length",
            }
            fwd_headers = {}
            for k, v in self.headers.items():
                if k.lower() in hop_by_hop:
                    continue
                fwd_headers[k] = v

            # Inject API key if not already present (matches frontend production build).
            if BACKEND_API_KEY and not any(
                k.lower() == "x-api-key" for k in fwd_headers
            ):
                fwd_headers["X-API-Key"] = BACKEND_API_KEY

            conn.request(method, self.path, body=body, headers=fwd_headers)
            resp = conn.getresponse()

            self.send_response(resp.status, resp.reason)
            for k, v in resp.getheaders():
                if k.lower() in hop_by_hop:
                    continue
                self.send_header(k, v)
            # end_headers will inject our CORS / no-store headers
            self.end_headers()

            # Stream body
            data = resp.read()
            if data:
                self.wfile.write(data)
            conn.close()
        except Exception as exc:
            self.send_error(502, f"Bad Gateway proxying to backend: {exc}")

    def _maybe_proxy(self, method):
        if self.path.startswith("/api/"):
            self._proxy_request(method)
            return True
        return False

    def do_GET(self):
        if self._maybe_proxy("GET"):
            return
        super().do_GET()

    def do_POST(self):
        if self._maybe_proxy("POST"):
            return
        self.send_error(405, "Method Not Allowed")

    def do_PUT(self):
        if self._maybe_proxy("PUT"):
            return
        self.send_error(405, "Method Not Allowed")

    def do_DELETE(self):
        if self._maybe_proxy("DELETE"):
            return
        self.send_error(405, "Method Not Allowed")

    def do_OPTIONS(self):
        # Always respond to OPTIONS for CORS preflight
        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("=" * 60)
        print("Energy Dashboard local server")
        print("=" * 60)
        print(f"  URL:               http://localhost:{PORT}")
        print(f"  Live dashboard:    http://localhost:{PORT}/energy-dashboard-live.html")
        print(f"  Original dashboard: http://localhost:{PORT}/index-original.html")
        print(f"  Static directory:  {DIRECTORY}")
        print(f"  API proxy target:  http://{BACKEND_HOST}:{BACKEND_PORT}")
        print("  HTTP version:      HTTP/1.0 (per workspace rule)")
        print("=" * 60)
        print("  Press Ctrl+C to stop")
        print()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            sys.exit(0)
