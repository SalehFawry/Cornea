"""Convenience entry-point.

Run from the backend/ directory using the Linux-native venv:
    ./venv_linux/bin/python run.py
    ./venv_linux/bin/uvicorn central_api.main:app --host 0.0.0.0 --port 8000 --reload

Do NOT use the `venv/` directory — it contains Windows (cp313-win_amd64)
binaries that cannot be loaded on Linux.
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "central_api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
