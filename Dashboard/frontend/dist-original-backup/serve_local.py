#!/usr/bin/env python3
"""Simple HTTP server for local dashboard testing"""

import http.server
import socketserver
import os

PORT = 8765
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Strip query parameters from path
        if '?' in path:
            path = path.split('?')[0]
        # Serve files from the specified directory
        path = path.lstrip('/')
        return os.path.join(DIRECTORY, path)

    def end_headers(self):
        # Disable caching for development
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

if __name__ == "__main__":
    os.chdir(DIRECTORY)

    # Allow port reuse
    socketserver.TCPServer.allow_reuse_address = True

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"\n{'='*50}")
        print(f"Energy Dashboard running locally!")
        print(f"{'='*50}")
        print(f"URL: http://localhost:{PORT}")
        print(f"Directory: {DIRECTORY}")
        print(f"{'='*50}")
        print("Press Ctrl+C to stop\n")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nServer stopped.")
