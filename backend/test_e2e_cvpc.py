#!/usr/bin/env python3
"""
End-to-end integration test for CVPC-facing FastAPI routes.

Creates isolated rows for TEST_BRANCH_ID / TEST_EMPLOYEE_ID, exercises POST+GET flows,
then tears down via direct SQL DELETE (no DELETE HTTP routes).

Run from the backend directory:
  cd backend
  export API_KEY=...   # required if the API enforces write/read keys
  python test_e2e_cvpc.py

Loads API_KEY from backend/.env when present (same as central_api Settings).
"""

from __future__ import annotations

import asyncio
import os
import sys
import uuid
from dataclasses import dataclass, field
from pathlib import Path

import requests

try:
    from dotenv import load_dotenv as _load_dotenv
except ImportError:
    _load_dotenv = None

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #

BASE_URL = "http://127.0.0.1:8000/api/v1"
TEST_BRANCH_ID = 99999
TEST_EMPLOYEE_ID = 99999
# API expects shutter-schedule ?day=YYYY-MM-DD (ISO date). This date is a Monday.
TEST_SCHEDULE_DAY_ISO = "2024-06-17"
TEST_CUSTOMER_ID = "cvpc-e2e-customer-99999"
TEST_ALERT_TYPE = "CVPC_E2E_TEST"

# --------------------------------------------------------------------------- #
# Results tracking
# --------------------------------------------------------------------------- #


@dataclass
class StepResult:
    name: str
    ok: bool
    status_code: int | None = None
    detail: str = ""


@dataclass
class RunReport:
    steps: list[StepResult] = field(default_factory=list)

    def add(self, name: str, ok: bool, status_code: int | None = None, detail: str = "") -> None:
        self.steps.append(StepResult(name=name, ok=ok, status_code=status_code, detail=detail))

    def print_summary(self) -> None:
        print("\n" + "=" * 72)
        print("E2E CVPC — SUMMARY")
        print("=" * 72)
        passed = sum(1 for s in self.steps if s.ok)
        failed = len(self.steps) - passed
        for s in self.steps:
            mark = "PASS" if s.ok else "FAIL"
            sc = f" HTTP {s.status_code}" if s.status_code is not None else ""
            extra = f" — {s.detail}" if s.detail else ""
            print(f"  [{mark}]{sc}  {s.name}{extra}")
        print("-" * 72)
        print(f"  Total: {len(self.steps)}  Passed: {passed}  Failed: {failed}")
        print("=" * 72 + "\n")


# --------------------------------------------------------------------------- #
# HTTP helpers
# --------------------------------------------------------------------------- #


def _session_headers(api_key: str) -> dict[str, str]:
    """Only API key here; requests adds Content-Type automatically for json= bodies."""
    if api_key:
        return {"X-API-Key": api_key}
    return {}


def _expect_ok(name: str, resp: requests.Response, report: RunReport) -> bool:
    if resp.status_code in (200, 201):
        report.add(name, True, resp.status_code)
        return True
    detail = (resp.text or "")[:200]
    report.add(name, False, resp.status_code, detail)
    return False


# --------------------------------------------------------------------------- #
# Database setup — FK parent row for POST /alerts (cornea_alert_info_table)
# --------------------------------------------------------------------------- #


async def _setup_alert_info_async() -> None:
    """Insert TEST_ALERT_TYPE into cornea_alert_info_table if missing (FK_ALERT_TYPE)."""
    from sqlalchemy import text

    from central_api.database import engine

    insert_sql = text(
        """
        INSERT INTO cornea_alert_info_table (alert_type, description, severity)
        VALUES (:at, :desc, :sev)
        """
    )
    exists_sql = text(
        "SELECT 1 FROM cornea_alert_info_table WHERE alert_type = :at"
    )

    async with engine.begin() as conn:
        row = await conn.execute(exists_sql, {"at": TEST_ALERT_TYPE})
        if row.scalar_one_or_none() is None:
            await conn.execute(
                insert_sql,
                {"at": TEST_ALERT_TYPE, "desc": "Test Alert", "sev": 1},
            )


# --------------------------------------------------------------------------- #
# Database teardown — uses the same async engine as the FastAPI app
# --------------------------------------------------------------------------- #


async def _teardown_db_async() -> None:
    """Delete test rows in FK-safe order (children before branch)."""
    # Import after sys.path is set in main()
    from sqlalchemy import text

    from central_api.database import engine

    bid = TEST_BRANCH_ID
    eid = TEST_EMPLOYEE_ID

    # Order: remove alerts for test branch before deleting FK parent row in alert_info.
    deletes = [
        ("cornea_shutter_table", "DELETE FROM cornea_shutter_table WHERE branch_id = :bid"),
        ("cornea_cash_door_table", "DELETE FROM cornea_cash_door_table WHERE branch_id = :bid"),
        ("cornea_alert_table", "DELETE FROM cornea_alert_table WHERE branch_id = :bid"),
        (
            "cornea_alert_info_table (E2E row)",
            "DELETE FROM cornea_alert_info_table WHERE alert_type = :atype",
        ),
        ("cornea_attendance_table", "DELETE FROM cornea_attendance_table WHERE branch_id = :bid"),
        ("cornea_customer_table", "DELETE FROM cornea_customer_table WHERE branch_id = :bid"),
        (
            "cornea_employees_table",
            "DELETE FROM cornea_employees_table WHERE branch_id = :bid OR employee_id = :eid",
        ),
        (
            "cornea_shutter_working_time_table",
            "DELETE FROM cornea_shutter_working_time_table WHERE branch_id = :bid",
        ),
        ("cornea_branch_table", "DELETE FROM cornea_branch_table WHERE branch_id = :bid"),
    ]

    async with engine.begin() as conn:
        for _table_name, sql in deletes:
            if "employee_id" in sql:
                await conn.execute(text(sql), {"bid": bid, "eid": eid})
            elif "alert_type = :atype" in sql:
                await conn.execute(text(sql), {"atype": TEST_ALERT_TYPE})
            else:
                await conn.execute(text(sql), {"bid": bid})

    await engine.dispose()


def teardown_db(report: RunReport | None = None) -> None:
    """Run async teardown in a fresh event loop (avoid mixing with in-process async engine)."""
    try:
        asyncio.run(_teardown_db_async())
        msg = "Teardown: deleted test data for branch_id=%s (Oracle tables)" % TEST_BRANCH_ID
        print(msg)
        if report is not None:
            report.add("Teardown (SQL DELETE)", True, detail=msg)
    except Exception as exc:  # noqa: BLE001
        err = "Teardown FAILED: %s" % exc
        print(err, file=sys.stderr)
        if report is not None:
            report.add("Teardown (SQL DELETE)", False, detail=str(exc))


async def _run_e2e_async(session: requests.Session, report: RunReport) -> None:
    """
    One asyncio.run() for all DB access: async SQLAlchemy + oracledb must not span
    multiple default event loops (otherwise teardown hits 'different loop' errors).
    """
    setup_ok = False
    try:
        await _setup_alert_info_async()
        msg = "Setup: INSERT alert_type=%r into cornea_alert_info_table (if absent)" % TEST_ALERT_TYPE
        print(msg)
        report.add("Setup (SQL INSERT alert info)", True, detail=msg)
        setup_ok = True
    except Exception as exc:  # noqa: BLE001
        err = "Setup FAILED (alert info): %s" % exc
        print(err, file=sys.stderr)
        report.add("Setup (SQL INSERT alert info)", False, detail=str(exc))
        raise
    try:
        await asyncio.to_thread(run_api_tests, session, report)
    finally:
        if setup_ok:
            try:
                await _teardown_db_async()
                tmsg = "Teardown: deleted test data for branch_id=%s (Oracle tables)" % TEST_BRANCH_ID
                print(tmsg)
                report.add("Teardown (SQL DELETE)", True, detail=tmsg)
            except Exception as exc:  # noqa: BLE001
                err = "Teardown FAILED: %s" % exc
                print(err, file=sys.stderr)
                report.add("Teardown (SQL DELETE)", False, detail=str(exc))


# --------------------------------------------------------------------------- #
# Test sequence
# --------------------------------------------------------------------------- #


def run_api_tests(session: requests.Session, report: RunReport) -> None:
    h = dict(session.headers)
    bid = TEST_BRANCH_ID
    eid = TEST_EMPLOYEE_ID

    # 1) POST /branches
    body_branch = {
        "branch_id": bid,
        "branch_name": "CVPC E2E Test Branch",
        "region": "TEST",
        "area": "TEST",
    }
    r = session.post(f"{BASE_URL}/branches", json=body_branch, headers=h, timeout=60)
    _expect_ok("POST /branches (create test branch)", r, report)

    # 2) POST /branches/{id}/employees
    body_emp = {
        "employee_id": eid,
        "branch_id": bid,
        "employee_name": "CVPC E2E Employee",
    }
    r = session.post(f"{BASE_URL}/branches/{bid}/employees", json=body_emp, headers=h, timeout=60)
    _expect_ok("POST /branches/{id}/employees", r, report)

    # 3) POST /branches/{id}/shutter-schedule
    body_sched = {
        "branch_id": bid,
        "weekday": "Monday",
        "shift_order": 1,
        "shutter_opening_time": "09:00",
        "shutter_partial_time": "13:00",
        "shutter_closing_time": "22:00",
    }
    r = session.post(f"{BASE_URL}/branches/{bid}/shutter-schedule", json=body_sched, headers=h, timeout=60)
    _expect_ok("POST /branches/{id}/shutter-schedule", r, report)

    # 4) POST /branches/{id}/shutter/events
    body_shutter_ev = {
        "event_type": "open",
        "event_time": "2024-06-17T09:05:00",
        "date": TEST_SCHEDULE_DAY_ISO,
    }
    r = session.post(
        f"{BASE_URL}/branches/{bid}/shutter/events",
        json=body_shutter_ev,
        headers=h,
        timeout=60,
    )
    _expect_ok("POST /branches/{id}/shutter/events", r, report)

    # 5) POST /branches/{id}/cash-door/events
    body_cash = {
        "event_type": "access",
        "event_time": "2024-06-17T09:10:00",
        "date": TEST_SCHEDULE_DAY_ISO,
    }
    r = session.post(
        f"{BASE_URL}/branches/{bid}/cash-door/events",
        json=body_cash,
        headers=h,
        timeout=60,
    )
    _expect_ok("POST /branches/{id}/cash-door/events", r, report)

    # 6) POST /branches/{id}/alerts (alert_type must match row in cornea_alert_info_table)
    body_alert = {
        "alert_id": str(uuid.uuid4()),
        "branch_id": bid,
        "alert_type": TEST_ALERT_TYPE,
        "timestamp": "2024-06-17T09:15:00",
        "date": TEST_SCHEDULE_DAY_ISO,
    }
    r = session.post(f"{BASE_URL}/branches/{bid}/alerts", json=body_alert, headers=h, timeout=60)
    _expect_ok("POST /branches/{id}/alerts", r, report)

    # 7) POST /branches/{id}/attendance/sync
    body_att = {
        "records": [
            {
                "branch_id": bid,
                "employee_id": eid,
                "date": TEST_SCHEDULE_DAY_ISO,
                "first_time_seen": "2024-06-17T08:00:00",
                "last_time_seen": "2024-06-17T17:00:00",
            }
        ]
    }
    r = session.post(
        f"{BASE_URL}/branches/{bid}/attendance/sync",
        json=body_att,
        headers=h,
        timeout=60,
    )
    _expect_ok("POST /branches/{id}/attendance/sync", r, report)

    # 8) POST /branches/{id}/customers/sync
    body_cust = {
        "records": [
            {
                "branch_id": bid,
                "customer_id": TEST_CUSTOMER_ID,
                "date": TEST_SCHEDULE_DAY_ISO,
                "first_time_seen": "2024-06-17T10:00:00",
                "last_time_seen": "2024-06-17T10:30:00",
                "service_time": 15.0,
                "waiting_time": 5.0,
            }
        ]
    }
    r = session.post(
        f"{BASE_URL}/branches/{bid}/customers/sync",
        json=body_cust,
        headers=h,
        timeout=60,
    )
    _expect_ok("POST /branches/{id}/customers/sync", r, report)

    # 9) GET /branches/{id}
    r = session.get(f"{BASE_URL}/branches/{bid}", headers=h, timeout=60)
    _expect_ok("GET /branches/{id}", r, report)

    # 10) GET /branches/{id}/employees
    r = session.get(f"{BASE_URL}/branches/{bid}/employees", headers=h, timeout=60)
    _expect_ok("GET /branches/{id}/employees", r, report)

    # 11) GET /branches/{id}/shutter-schedule?day=...  (ISO Monday; API does not accept ?day=Monday)
    r = session.get(
        f"{BASE_URL}/branches/{bid}/shutter-schedule",
        params={"day": TEST_SCHEDULE_DAY_ISO},
        headers=h,
        timeout=60,
    )
    _expect_ok(
        "GET /branches/{id}/shutter-schedule?day=%s (Monday as ISO)" % TEST_SCHEDULE_DAY_ISO,
        r,
        report,
    )

    # 12) GET /branches/{id}/attendance
    r = session.get(f"{BASE_URL}/branches/{bid}/attendance", headers=h, timeout=60)
    _expect_ok("GET /branches/{id}/attendance", r, report)

    # 13) GET /branches/{id}/customers
    r = session.get(f"{BASE_URL}/branches/{bid}/customers", headers=h, timeout=60)
    _expect_ok("GET /branches/{id}/customers", r, report)


def main() -> int:
    backend_dir = Path(__file__).resolve().parent
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    if _load_dotenv is not None:
        _load_dotenv(backend_dir / ".env")

    api_key = os.environ.get("API_KEY", "").strip()
    report = RunReport()

    print("Target: %s" % BASE_URL)
    print("Test branch_id=%s employee_id=%s" % (TEST_BRANCH_ID, TEST_EMPLOYEE_ID))
    print("X-API-Key: %s\n" % ("set" if api_key else "not set"))

    session = requests.Session()
    session.headers.update(_session_headers(api_key))

    try:
        asyncio.run(_run_e2e_async(session, report))
    finally:
        report.print_summary()
    any_fail = any(not s.ok for s in report.steps)
    return 1 if any_fail else 0


if __name__ == "__main__":
    sys.exit(main())
