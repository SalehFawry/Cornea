# CVPC expected endpoints vs FastAPI codebase

Audit of `central_api/routers/*.py` with `main.py` prefix `/api/v1`.

| Expected Endpoint | Exists in Code? (Yes/No) | Actual codebase path (if different) | Missing models/schemas? |
|-------------------|--------------------------|-------------------------------------|-------------------------|
| `GET /api/v1/branches/{branch_id}` | **Yes** | Same (`routers/branches.py` — `get_branch`) | No — `BranchResponse` |
| `GET /api/v1/branches/{branch_id}/employees` | **Yes** | Same (`routers/branches.py` — `list_employees`) | No — `EmployeeResponse[]` |
| `GET /api/v1/branches/{branch_id}/shutter-schedule/{day}` | **No** | `GET /api/v1/branches/{branch_id}/shutter-schedule?day=YYYY-MM-DD` | No — same `ShutterScheduleResponse`; **path shape differs** (query vs path) |
| `PUT /api/v1/branches/{branch_id}` | **No** | `POST /api/v1/branches` with body `BranchCreate` (includes `branch_id`) | No — `BranchCreate` exists; **verb/path differ** |
| `PUT /api/v1/employees/{employee_id}` | **No** | `POST /api/v1/branches/{branch_id}/employees` with body `EmployeeCreate` | No — `EmployeeCreate` exists; **no top-level employee route** |
| `PUT /api/v1/branches/{branch_id}/shutter-schedule/{weekday}/{shift_order}` | **No** | `POST /api/v1/branches/{branch_id}/shutter-schedule` with body `ShutterScheduleCreate` | No — schema has `weekday`, `shift_order`; **verb/path differ** |
| `POST /api/v1/branches/{branch_id}/events/shutter` | **No** | `POST /api/v1/branches/{branch_id}/shutter/events` | No — `ShutterEventCreate` |
| `POST /api/v1/branches/{branch_id}/events/cash-door` | **No** | `POST /api/v1/branches/{branch_id}/cash-door/events` | No — `CashDoorEventCreate` |
| `POST /api/v1/alerts` | **No** | `POST /api/v1/branches/{branch_id}/alerts` | No — `AlertCreate` (expects `branch_id` in body + path segment) |
| `POST /api/v1/branches/{branch_id}/attendance/batch` | **No** | `POST /api/v1/branches/{branch_id}/attendance/sync` | No — `AttendanceSyncPayload` |
| `POST /api/v1/branches/{branch_id}/customers/batch` | **No** | `POST /api/v1/branches/{branch_id}/customers/sync` | No — `CustomerSyncPayload` |
| `GET /api/v1/branches/{branch_id}/attendance` | **Yes** | Same (`routers/attendance.py` — `list_attendance`) | No — `AttendanceResponse[]` |
| `GET /api/v1/branches/{branch_id}/customers` | **Yes** | Same (`routers/customers.py` — `list_customers`) | No — `CustomerResponse[]` |

## Summary

- **3 / 13** match the expected path and HTTP method exactly.
- **10 / 13** differ (path shape, verb, or naming: `sync` vs `batch`, `shutter/events` vs `events/shutter`, query `day` vs path `{day}`).

To align CVPC with this API, either **update the camera client** to these URLs or **add alias routes** in FastAPI that mirror the expected paths and delegate to existing handlers.
