#!/usr/bin/env python3
"""
E2E smoke test: hit the 13 CVPC-expected URL shapes on the local FastAPI server.

Usage:
  cd backend
  pip install requests python-dotenv   # if needed
  export API_KEY=...                   # optional; matches central_api Settings.api_key
  python test_cvpc_endpoints.py

Loads API_KEY from environment or backend/.env (same key as FastAPI uses).

Env overrides:
  TEST_BRANCH_ID, TEST_EMPLOYEE_ID — used if GET /api/v1/branches fails to return data.

Note: For GET /api/v1/branches/{id}, HTTP 404 can mean "branch not found" while the
route still exists; this script picks the first branch_id from GET /api/v1/branches.
"""

import os
import sys
from pathlib import Path

import requests

try:
    from dotenv import load_dotenv as _load_dotenv
except ImportError:
    _load_dotenv = None  # type: ignore[assignment]

BASE = "http://127.0.0.1:8000"
DAY = "2024-06-15"
WEEKDAY = "monday"
SHIFT_ORDER = 1

# Minimal JSON bodies for POST/PUT (may still yield 422 if schema is stricter)
DUMMY_SHUTTER_EVENT = {
    "event_type": "open",
    "event_time": "2024-06-15T10:00:00Z",
    "date": "2024-06-15",
}
DUMMY_CASH_DOOR_EVENT = {
    "event_type": "access",
    "event_time": "2024-06-15T10:00:00Z",
    "date": "2024-06-15",
}
DUMMY_ALERT = {
    "alert_id": "00000000-0000-4000-8000-000000000001",
    "alert_type": "test",
    "timestamp": "2024-06-15T10:00:00Z",
    "date": "2024-06-15",
}
DUMMY_BRANCH_PUT = {
    "branch_name": "dummy",
    "region": "r",
    "area": "a",
}
DUMMY_EMPLOYEE_PUT = {
    "employee_name": "dummy",
}
DUMMY_SHUTTER_SCHEDULE_PUT = {
    "weekday": WEEKDAY,
    "shift_order": SHIFT_ORDER,
    "shutter_opening_time": "09:00",
}

def build_endpoints(branch_id: int, employee_id: int) -> list:
    b = branch_id
    e = employee_id
    return [
        ("GET", f"/api/v1/branches/{b}", None, None),
        ("GET", f"/api/v1/branches/{b}/employees", None, None),
        ("GET", f"/api/v1/branches/{b}/shutter-schedule/{DAY}", None, None),
        ("PUT", f"/api/v1/branches/{b}", "application/json", {**DUMMY_BRANCH_PUT, "branch_id": b}),
        (
            "PUT",
            f"/api/v1/employees/{e}",
            "application/json",
            {**DUMMY_EMPLOYEE_PUT, "branch_id": b, "employee_id": e},
        ),
        (
            "PUT",
            f"/api/v1/branches/{b}/shutter-schedule/{WEEKDAY}/{SHIFT_ORDER}",
            "application/json",
            {**DUMMY_SHUTTER_SCHEDULE_PUT, "branch_id": b},
        ),
        ("POST", f"/api/v1/branches/{b}/events/shutter", "application/json", DUMMY_SHUTTER_EVENT),
        ("POST", f"/api/v1/branches/{b}/events/cash-door", "application/json", DUMMY_CASH_DOOR_EVENT),
        ("POST", "/api/v1/alerts", "application/json", {**DUMMY_ALERT, "branch_id": b}),
        (
            "POST",
            f"/api/v1/branches/{b}/attendance/batch",
            "application/json",
            {
                "records": [
                    {
                        "branch_id": b,
                        "employee_id": e,
                        "date": DAY,
                    }
                ]
            },
        ),
        (
            "POST",
            f"/api/v1/branches/{b}/customers/batch",
            "application/json",
            {
                "records": [
                    {
                        "branch_id": b,
                        "customer_id": "cust-dummy-1",
                        "date": DAY,
                    }
                ]
            },
        ),
        ("GET", f"/api/v1/branches/{b}/attendance", None, None),
        ("GET", f"/api/v1/branches/{b}/customers", None, None),
    ]


def main() -> int:
    backend_dir = Path(__file__).resolve().parent
    if _load_dotenv is not None:
        _load_dotenv(backend_dir / ".env")
    api_key = os.environ.get("API_KEY", "").strip()

    headers: dict[str, str] = {}
    if api_key:
        headers["X-API-Key"] = api_key

    print(f"Target: {BASE}")
    print(f"X-API-Key: {'set' if api_key else 'not set (open mode if server has no API_KEY)'}\n")

    # Resolve a real branch_id so GET /branches/{id} is not confused with "route missing".
    branch_id = int(os.environ.get("TEST_BRANCH_ID", "0"))
    employee_id = int(os.environ.get("TEST_EMPLOYEE_ID", "1"))
    try:
        r = requests.get(
            f"{BASE}/api/v1/branches",
            headers=dict(headers),
            params={"limit": 5, "offset": 0},
            timeout=15,
        )
        if r.status_code == 200 and isinstance(r.json(), list) and r.json():
            branch_id = int(r.json()[0]["branch_id"])
            print(f"Using branch_id={branch_id} from GET /api/v1/branches")
        else:
            print(f"Using branch_id={branch_id} from TEST_BRANCH_ID (list branches returned {r.status_code})")
    except (requests.RequestException, ValueError, KeyError, TypeError) as ex:
        print(f"Using branch_id={branch_id} (could not auto-resolve: {ex})")
    print(f"Using employee_id={employee_id} for dummy PUT body\n")

    ok_codes = {200, 201, 422}

    for method, path, content_type, body in build_endpoints(branch_id, employee_id):
        url = f"{BASE}{path}"
        kw: dict = {"headers": dict(headers), "timeout": 30}
        if body is not None:
            kw["headers"]["Content-Type"] = content_type or "application/json"
            kw["json"] = body

        try:
            resp = requests.request(method, url, **kw)
        except requests.RequestException as e:
            print(f"❌ ERROR  {method:4} {path}  →  {e}")
            continue

        code = resp.status_code
        if code == 404:
            print(f"❌ MISSING (Got {code})  {method:4} {path}")
        elif code in ok_codes:
            print(f"✅ EXISTS (Got {code})  {method:4} {path}")
        else:
            # 403/401 = route often matched but auth failed; 500 = server error but route may exist
            hint = ""
            if code in (401, 403):
                hint = " [route likely exists; check API_KEY]"
            elif code == 405:
                hint = " [method not allowed — route may exist for other verb]"
            print(f"⚠️  OTHER (Got {code}){hint}  {method:4} {path}")

    print("\n--- Reference: implemented equivalents (see docs/CVPC_ENDPOINT_AUDIT.md) ---")
    print("GET  shutter-schedule  →  GET .../shutter-schedule?day=YYYY-MM-DD")
    print("PUT  branch/employee/shutter-schedule  →  POST .../branches, POST .../employees, POST .../shutter-schedule")
    print("POST events/*  →  POST .../shutter/events , POST .../cash-door/events")
    print("POST alerts     →  POST .../branches/{id}/alerts")
    print("POST */batch    →  POST .../attendance/sync , POST .../customers/sync")

    return 0


if __name__ == "__main__":
    sys.exit(main())
