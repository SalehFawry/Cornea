from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import sqlite3
from typing import Optional
from datetime import datetime, date, time, timedelta
from pathlib import Path
from db_filtering import (
    filter_employee_data,
    filter_customer_data,
    filter_shutter_data,
    filter_alert_data,
    filter_customer_data_raw
)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Database configuration
# Use relative path from script location, or create 'run' directory in current working directory
DB_DIR = Path("db")
DB_DIR.mkdir(exist_ok=True)  # Create directory if it doesn't exist
#DB_FILE = DB_DIR / "2026-03-03-01-11-00_central_db.db"
DB_FILE = DB_DIR / "central_db.db"

# Backward-compatible default value used by existing response schemas
GOVERNORATE = "Giza"

# Database filtering configuration
# Set to True to apply all database filters (e.g., exclude customers with service_time & waiting_time < 1/60 hours)
# Set to False to read database with no filters
FILTER_DB = True

def get_db_connection():
    """Get database connection"""
    # Ensure the directory exists
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(str(DB_FILE))


def operational_date_from_timestamp(ts):
    # Returns Optional[date] - the operational date for the given timestamp
    """
    Return the operational date (as date) for a timestamp.
    Operational day: 7:00 AM to 3:00 AM next day (7:00 day D -> 3:00 day D+1).
    So 7:00 on D starts day D; 2:59 on D+1 is still day D; 3:00 on D+1 starts day D+1.
    """
    if ts is None or (isinstance(ts, float) and pd.isna(ts)):
        return None
    t = pd.to_datetime(ts, errors="coerce")
    if pd.isna(t):
        return None
    d = t.date() if hasattr(t, "date") else t
    if isinstance(d, datetime):
        d = d.date()
    # If time >= 7:00, belongs to same calendar day; else belongs to previous operational day
    if hasattr(t, "time"):
        tm = t.time() if hasattr(t, "time") else time(0, 0)
    else:
        tm = time(0, 0)
    if tm >= time(7, 0):
        return d
    return d - timedelta(days=1)


def get_branch_name(branch_id):
    """Get branch name from branch_table using branch_id."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='branch_table'")
        if not cursor.fetchone():
            return f"Branch {branch_id}"

        branch_id_col = _branch_table_column(conn, ["branch_id"])
        branch_name_col = _branch_table_column(conn, ["branch_name", "name"])
        if not branch_id_col or not branch_name_col:
            return f"Branch {branch_id}"

        query = f"SELECT {branch_name_col} FROM branch_table WHERE {branch_id_col} = ? LIMIT 1"
        row = conn.execute(query, [str(branch_id)]).fetchone()
        if row and row[0] is not None and str(row[0]).strip():
            return str(row[0]).strip()
        return f"Branch {branch_id}"
    except Exception:
        return f"Branch {branch_id}"
    finally:
        conn.close()


def _branch_table_column(conn, candidates):
    """Return first existing branch_table column from candidates."""
    try:
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(branch_table)")
        cols = [r[1] for r in cursor.fetchall()]
        cols_lower_map = {c.lower(): c for c in cols}
        for cand in candidates:
            if cand.lower() in cols_lower_map:
                return cols_lower_map[cand.lower()]
    except Exception:
        return None
    return None


def _resolve_area(area: Optional[str] = None, governorate: Optional[str] = None) -> Optional[str]:
    """Use area when provided, else fallback to governorate for backward compatibility."""
    return area if area else governorate


def _get_branch_ids_by_region_area(region: Optional[str] = None, area: Optional[str] = None):
    """Get branch IDs from branch_table filtered by region/area (if provided)."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='branch_table'")
        if not cursor.fetchone():
            return None

        branch_id_col = _branch_table_column(conn, ["branch_id"])
        # Region can be stored as region/governorate in some databases
        region_col = _branch_table_column(conn, ["region", "branch_region", "governorate"])
        area_col = _branch_table_column(conn, ["area", "branch_area", "district", "zone"])
        if not branch_id_col:
            return None

        query = f"SELECT DISTINCT {branch_id_col} FROM branch_table WHERE {branch_id_col} IS NOT NULL"
        params = []
        if region and region_col:
            query += f" AND {region_col} = ?"
            params.append(region)
        if area and area_col:
            query += f" AND {area_col} = ?"
            params.append(area)

        out = pd.read_sql_query(query, conn, params=params)
        if out.empty:
            return set()
        return set(out[branch_id_col].astype(str).tolist())
    except Exception:
        return None
    finally:
        conn.close()


def _get_branch_name_options(region: Optional[str] = None, area: Optional[str] = None):
    """
    Return branch options directly from branch_table filtered by region/area.
    Output format: [{"Branch ID": int, "Branch Name": str}, ...]
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='branch_table'")
        if not cursor.fetchone():
            return []

        branch_id_col = _branch_table_column(conn, ["branch_id"])
        branch_name_col = _branch_table_column(conn, ["branch_name", "name"])
        region_col = _branch_table_column(conn, ["region", "branch_region", "governorate"])
        area_col = _branch_table_column(conn, ["area", "branch_area", "district", "zone"])
        if not branch_id_col:
            return []

        select_name = f", {branch_name_col} as branch_name" if branch_name_col else ""
        query = f"SELECT DISTINCT {branch_id_col} as branch_id{select_name} FROM branch_table WHERE {branch_id_col} IS NOT NULL"
        params = []
        if region and region_col:
            query += f" AND {region_col} = ?"
            params.append(region)
        if area and area_col:
            query += f" AND {area_col} = ?"
            params.append(area)

        df = pd.read_sql_query(query, conn, params=params)
        if df.empty or "branch_id" not in df.columns:
            return []

        result = []
        for _, row in df.iterrows():
            try:
                branch_id = int(row["branch_id"])
                if "branch_name" in df.columns and pd.notna(row["branch_name"]):
                    branch_name = str(row["branch_name"])
                else:
                    branch_name = get_branch_name(branch_id)
                result.append({"Branch ID": branch_id, "Branch Name": branch_name})
            except (ValueError, TypeError):
                continue

        return sorted(result, key=lambda x: x["Branch Name"])
    except Exception:
        return []
    finally:
        conn.close()


@app.get("/filters/regions")
def get_regions():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='branch_table'")
        if not cursor.fetchone():
            return []
        # Region can be stored as region/governorate in some databases
        region_col = _branch_table_column(conn, ["region", "branch_region", "governorate"])
        if not region_col:
            return []
        df = pd.read_sql_query(f"SELECT DISTINCT {region_col} as region FROM branch_table WHERE {region_col} IS NOT NULL", conn)
        return sorted([str(x) for x in df["region"].dropna().unique().tolist()])
    except Exception:
        return []
    finally:
        conn.close()


@app.get("/filters/areas")
def get_areas(region: Optional[str] = None):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='branch_table'")
        if not cursor.fetchone():
            return []
        # Region can be stored as region/governorate in some databases
        region_col = _branch_table_column(conn, ["region", "branch_region", "governorate"])
        area_col = _branch_table_column(conn, ["area", "branch_area", "district", "zone"])
        if not area_col:
            return []
        query = f"SELECT DISTINCT {area_col} as area FROM branch_table WHERE {area_col} IS NOT NULL"
        params = []
        if region and region_col:
            query += f" AND {region_col} = ?"
            params.append(region)
        df = pd.read_sql_query(query, conn, params=params)
        return sorted([str(x) for x in df["area"].dropna().unique().tolist()])
    except Exception:
        return []
    finally:
        conn.close()


def _shutter_table_name(conn):
    """Return the shutter table name (shutter_table or shutter_state) if it exists."""
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND (name='shutter_table' OR name='shutter_state')")
    row = cursor.fetchone()
    return row[0] if row else None


# Load data from database functions
def load_employee_data():
    """Load employee data from attendance_table"""
    conn = get_db_connection()
    try:
        # Check if table exists
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance_table'")
        if not cursor.fetchone():
            conn.close()
            return pd.DataFrame()
        
        # Working hours: use total_hours when present, else fall back to disk_hours
        cursor.execute("PRAGMA table_info(attendance_table)")
        cols = [r[1].lower() for r in cursor.fetchall()]
        has_total_hours = "total_hours" in cols
        working_hours_col = 'total_hours as "Working hours"' if has_total_hours else 'disk_hours as "Working hours"'
        extra_col = ', disk_hours as "Disk hours"' if has_total_hours else ""

        query = """
            SELECT 
                branch_id as "Branch ID",
                employee_id as "Employee ID",
                """ + working_hours_col + """,
                first_time_seen as "First time seen",
                last_time_seen as "Last time seen",
                date as "Date"
                """ + extra_col + """
            FROM attendance_table
        """
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        if df.empty:
            return df
        
        # Add hardcoded fields
        df["Governorate"] = GOVERNORATE
        df["Branch Name"] = df["Branch ID"].apply(get_branch_name)
        
        # Apply filtering using global FILTER_DB setting
        df = filter_employee_data(df, filter_db=FILTER_DB)
        if df.empty:
            return df

        # Assign operational date (7:00 AM - 3:00 AM next day) from first_time_seen or Date
        first_ts = df["First time seen"] if "First time seen" in df.columns else df.get("Date")
        df["_op_date"] = pd.to_datetime(first_ts, errors="coerce").apply(
            lambda t: operational_date_from_timestamp(t) if pd.notna(t) else None
        )
        # Fallback: use Date column if _op_date is null
        if "Date" in df.columns:
            df["_op_date"] = df["_op_date"].fillna(pd.to_datetime(df["Date"], errors="coerce").dt.date)
        df = df[df["_op_date"].notna()].copy()

        # Aggregate by (Branch ID, Employee ID, operational day): sum hours, min first time, max last time
        agg_map = {
            "Working hours": "sum",
            "First time seen": "min",
            "Last time seen": "max",
            "Governorate": "first",
            "Branch Name": "first",
        }
        if "Disk hours" in df.columns:
            agg_map["Disk hours"] = "sum"
        grouped = df.groupby(["Branch ID", "Employee ID", "_op_date"], dropna=False).agg(agg_map).reset_index()
        grouped = grouped.rename(columns={"_op_date": "Date"})
        grouped["Date"] = pd.to_datetime(grouped["Date"], errors="coerce").dt.strftime("%Y-%m-%dT00:00:00")
        
        return grouped
    except Exception as e:
        conn.close()
        import traceback
        print(f"Error in load_employee_data: {e}")
        print(traceback.format_exc())
        return pd.DataFrame()

def load_shutter_data():
    """Load shutter data from shutter_table. Detects table/column names for compatibility."""
    conn = get_db_connection()
    try:
        table_name = _shutter_table_name(conn)
        if not table_name:
            conn.close()
            return pd.DataFrame()

        cursor = conn.cursor()
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns_info = cursor.fetchall()
        col_names = [c[1] for c in columns_info]
        col_lower = [c.lower() for c in col_names]

        # Map to expected names: Branch ID, event, time stamp, Date
        branch_col = None
        event_col = None
        time_col = None
        date_col = None
        for i, (name, lower) in enumerate(zip(col_names, col_lower)):
            if "branch" in lower and ("id" in lower or lower == "branch_id"):
                branch_col = name
            if "event" in lower and ("type" in lower or lower == "event"):
                event_col = name
            if "event_time" in lower or "timestamp" in lower or "time" in lower:
                if time_col is None or "event_time" in lower or "timestamp" in lower:
                    time_col = name
            if lower == "date" or "date" in lower:
                date_col = name

        if not branch_col:
            branch_col = "branch_id" if "branch_id" in col_names else col_names[0]
        if not event_col:
            event_col = "event_type" if "event_type" in col_names else "event" if "event" in col_names else None
        if not time_col:
            time_col = "event_time" if "event_time" in col_names else "timestamp" if "timestamp" in col_names else None
        if not date_col:
            date_col = "date" if "date" in col_names else None

        if not event_col or not time_col:
            conn.close()
            return pd.DataFrame()

        select_parts = [
            f'{branch_col} as "Branch ID"',
            f'{event_col} as "event"',
            f'{time_col} as "time stamp"',
        ]
        if date_col:
            select_parts.append(f'{date_col} as "Date"')
        query = "SELECT " + ", ".join(select_parts) + f" FROM {table_name}"
        df = pd.read_sql_query(query, conn)
        conn.close()
    except Exception as e:
        import traceback
        print(f"Error in load_shutter_data: {e}")
        print(traceback.format_exc())
        try:
            conn.close()
        except Exception:
            pass
        return pd.DataFrame()

    if df.empty:
        return df

    # Add hardcoded fields
    df["Governorate"] = GOVERNORATE
    df["Branch Name"] = df["Branch ID"].apply(get_branch_name)

    # Convert date to ISO format string (errors='coerce' so bad dates become NaT, not crash)
    if "Date" in df.columns:
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce").dt.strftime("%Y-%m-%dT00:00:00")

    # Format time stamp (errors='coerce' for invalid times)
    if "time stamp" in df.columns:
        df["time stamp"] = pd.to_datetime(df["time stamp"], errors="coerce").dt.strftime("%H:%M:%S")

    # Apply filtering using global FILTER_DB setting
    df = filter_shutter_data(df, filter_db=FILTER_DB)

    return df

def load_customer_data():
    """Load customer data from customer_table. Multiple records per customer per day are aggregated by operational day (7:00 AM - 3:00 AM)."""
    conn = get_db_connection()
    query = """
        SELECT 
            branch_id as "Branch ID",
            customer_id as "customer ID",
            service_time as "service time",
            waiting_time as "waiting time",
            first_time_seen as "visit start time",
            last_time_seen as "service end time",
            date as "Date"
        FROM customer_table
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    # Apply filtering BEFORE converting to minutes (data is still in hours)
    df = filter_customer_data_raw(df, filter_db=FILTER_DB)
    if df.empty:
        return df

    # Assign operational date (7:00 AM - 3:00 AM next day) from visit start time or Date
    visit_start = pd.to_datetime(df["visit start time"], errors="coerce")
    df["_op_date"] = visit_start.apply(
        lambda t: operational_date_from_timestamp(t) if pd.notna(t) else None
    )
    if "Date" in df.columns:
        df["_op_date"] = df["_op_date"].fillna(pd.to_datetime(df["Date"], errors="coerce").dt.date)
    df = df[df["_op_date"].notna()].copy()
    if df.empty:
        return df

    # Aggregate by (Branch ID, customer ID, operational day): sum service_time, waiting_time; min/max times
    grouped = df.groupby(["Branch ID", "customer ID", "_op_date"], dropna=False).agg({
        "service time": "sum",
        "waiting time": "sum",
        "visit start time": "min",
        "service end time": "max",
    }).reset_index()
    grouped = grouped.rename(columns={"_op_date": "Date"})
    df = grouped

    # Convert service_time and waiting_time from hours to minutes
    if "service time" in df.columns:
        df["service time"] = df["service time"] * 60
    if "waiting time" in df.columns:
        df["waiting time"] = df["waiting time"] * 60

    # Add hardcoded fields
    df["Governorate"] = GOVERNORATE
    df["Branch Name"] = df["Branch ID"].apply(get_branch_name)

    # Convert date to ISO format string
    if "Date" in df.columns:
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce").dt.strftime("%Y-%m-%dT00:00:00")
    if "visit start time" in df.columns:
        df["visit start time"] = pd.to_datetime(df["visit start time"], errors="coerce").dt.strftime("%Y-%m-%dT%H:%M:%S")
    if "service end time" in df.columns:
        df["service end time"] = pd.to_datetime(df["service end time"], errors="coerce").dt.strftime("%Y-%m-%dT%H:%M:%S")

    return df

@app.get("/")
async def root():
    return {"message": "Multi-page Dashboard API"}

# ========== EMPLOYEES ENDPOINTS ==========
@app.get("/employees/branches")
def get_employee_branches():
    df = load_employee_data()
    # Convert to int for compatibility with existing code
    branch_ids = df["Branch ID"].dropna().unique().tolist()
    return sorted([int(bid) if isinstance(bid, str) else int(bid) for bid in branch_ids])

@app.get("/employees/branch-names")
def get_employee_branch_names(region: Optional[str] = None, area: Optional[str] = None, governorate: Optional[str] = None):
    area_value = _resolve_area(area, governorate)
    return _get_branch_name_options(region=region, area=area_value)

@app.get("/employees/areas")
def get_employee_areas(region: Optional[str] = None):
    return get_areas(region=region)


@app.get("/employees/regions")
def get_employee_regions():
    return get_regions()


@app.get("/employees/governorates")
def get_employee_governorates():
    # Backward-compatible alias for areas
    return get_areas()

@app.get("/employees/data")
def get_employee_data(
    branch: Optional[int] = None,
    date: Optional[str] = None,
    employee: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    governorate: Optional[str] = None
):
    try:
        df = load_employee_data()
        
        if df.empty:
            return []
        
        # Parse date from ISO format or direct date
        if "Date" in df.columns:
            df["Date_parsed"] = pd.to_datetime(df["Date"], errors='coerce').dt.date
            # Filter out any rows with invalid dates (NaT)
            df = df[df["Date_parsed"].notna()].copy()
        
        # Filter
        if governorate and "Governorate" in df.columns:
            df = df[df["Governorate"] == governorate]
        if branch:
            # Branch ID in DB is VARCHAR, so compare as string
            df = df[df["Branch ID"].astype(str) == str(branch)]
        if date:
            try:
                # Handle ISO format (2025-12-20T00:00:00) or YYYY-MM-DD
                if 'T' in date:
                    target_date = pd.to_datetime(date.split('T')[0]).date()
                else:
                    target_date = pd.to_datetime(date).date()
                if "Date_parsed" in df.columns:
                    df = df[df["Date_parsed"] == target_date]
            except:
                pass
        elif start_date and end_date:
            # Date range filter
            try:
                if 'T' in start_date:
                    start = pd.to_datetime(start_date.split('T')[0]).date()
                else:
                    start = pd.to_datetime(start_date).date()
                if 'T' in end_date:
                    end = pd.to_datetime(end_date.split('T')[0]).date()
                else:
                    end = pd.to_datetime(end_date).date()
                if "Date_parsed" in df.columns:
                    df = df[(df["Date_parsed"] >= start) & (df["Date_parsed"] <= end)]
            except:
                pass
        if employee:
            df = df[df["Employee ID"] == int(employee)]
        
        if df.empty:
            return []
        
        # Return original columns - convert Branch ID to int for compatibility (include Disk hours if present)
        required_cols = ["Branch ID", "Date", "Employee ID", "First time seen", "Last time seen", "Working hours", "Disk hours"]
        available_cols = [col for col in required_cols if col in df.columns]
        if not available_cols:
            return []
        
        result = df[available_cols].copy()
        if "Branch ID" in result.columns:
            result["Branch ID"] = result["Branch ID"].astype(int)
        return result.to_dict(orient="records")
    except Exception as e:
        # Log the error for debugging
        import traceback
        print(f"Error in get_employee_data: {e}")
        print(traceback.format_exc())
        return []

@app.get("/employees/dates")
def get_employee_dates(branch: Optional[int] = None, governorate: Optional[str] = None):
    try:
        conn = get_db_connection()
        
        # Check if table exists
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance_table'")
        if not cursor.fetchone():
            conn.close()
            return []
        
        # Read dates directly from database
        query = "SELECT DISTINCT date, branch_id FROM attendance_table WHERE date IS NOT NULL"
        params = []
        
        if branch:
            query += " AND branch_id = ?"
            params.append(str(branch))
        
        df = pd.read_sql_query(query, conn, params=params)
        conn.close()
        
        if df.empty or "date" not in df.columns:
            return []
        
        # Parse dates and filter out invalid ones
        df["date_parsed"] = pd.to_datetime(df["date"], errors='coerce')
        # Filter out invalid dates (NaT) and dates before 1900 (likely invalid)
        df = df[df["date_parsed"].notna()].copy()
        df = df[df["date_parsed"].dt.year >= 1900].copy()
        df["date_parsed"] = df["date_parsed"].dt.date
        
        if df.empty:
            return []
        
        dates = sorted(df["date_parsed"].unique())
        return [d.isoformat() if hasattr(d, 'isoformat') else str(d) for d in dates]
    except Exception as e:
        # Log the error for debugging
        import traceback
        print(f"Error in get_employee_dates: {e}")
        print(traceback.format_exc())
        return []

@app.get("/employees/employees")
def get_employees(branch: Optional[int] = None, date: Optional[str] = None, governorate: Optional[str] = None):
    df = load_employee_data()
    
    if "Date" in df.columns:
        df["Date_parsed"] = pd.to_datetime(df["Date"]).dt.date
    
    if governorate and "Governorate" in df.columns:
        df = df[df["Governorate"] == governorate]
    if branch:
        # Branch ID in DB is VARCHAR, so compare as string
        df = df[df["Branch ID"].astype(str) == str(branch)]
    if date:
        try:
            if 'T' in date:
                target_date = pd.to_datetime(date.split('T')[0]).date()
            else:
                target_date = pd.to_datetime(date).date()
            df = df[df["Date_parsed"] == target_date]
        except:
            pass
    
    return sorted([int(eid) for eid in df["Employee ID"].dropna().unique().tolist()])

@app.get("/employees/total-count")
def get_total_employees_count(branch: Optional[int] = None, governorate: Optional[str] = None):
    """
    Get total count of employees from employees_table filtered by branch and governorate.
    This counts all employees in the employees_table, not just those with attendance records.
    """
    conn = get_db_connection()
    
    try:
        # First, check what columns exist in employees_table
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(employees_table)")
        columns_info = cursor.fetchall()
        column_names = [row[1] for row in columns_info]
        
        # Determine the correct column names (handle different naming conventions)
        employee_id_col = None
        branch_id_col = None
        governorate_col = None
        
        for col in column_names:
            col_lower = col.lower()
            if 'employee' in col_lower and 'id' in col_lower:
                employee_id_col = col
            if 'branch' in col_lower and 'id' in col_lower:
                branch_id_col = col
            if 'governorate' in col_lower:
                governorate_col = col
        
        # Default column names if not found
        if not employee_id_col:
            employee_id_col = "employee_id"
        if not branch_id_col:
            branch_id_col = "branch_id"
        
        # Build query
        query = f"SELECT COUNT(DISTINCT {employee_id_col}) as total FROM employees_table WHERE 1=1"
        params = []
        
        if branch and branch_id_col:
            query += f" AND {branch_id_col} = ?"
            params.append(str(branch))
        
        if governorate and governorate_col:
            query += f" AND {governorate_col} = ?"
            params.append(governorate)
        
        cursor.execute(query, params)
        result = cursor.fetchone()
        total = result[0] if result else 0
        
        conn.close()
        return {"total": total}
    except Exception as e:
        conn.close()
        # Fallback: if employees_table doesn't exist or has issues, return 0
        return {"total": 0}

@app.get("/employees/list")
def get_employees_list(branch: Optional[int] = None, governorate: Optional[str] = None):
    """
    Get list of employees (id and name) from employees_table filtered by branch and governorate.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='employees_table'")
        if not cursor.fetchone():
            conn.close()
            return [{"employee_id": 0, "name": "Security Man"}]
        cursor.execute("PRAGMA table_info(employees_table)")
        columns_info = cursor.fetchall()
        column_names = [row[1] for row in columns_info]
        employee_id_col = None
        branch_id_col = None
        governorate_col = None
        name_col = None
        for col in column_names:
            col_lower = col.lower()
            if 'employee' in col_lower and 'id' in col_lower:
                employee_id_col = col
            if 'branch' in col_lower and 'id' in col_lower:
                branch_id_col = col
            if 'governorate' in col_lower:
                governorate_col = col
            if col_lower in ('name', 'employee_name', 'employee name'):
                name_col = col
        if not employee_id_col:
            employee_id_col = "employee_id"
        if not branch_id_col:
            branch_id_col = "branch_id"
        select_cols = [employee_id_col]
        if name_col:
            select_cols.append(name_col)
        query = f"SELECT DISTINCT {', '.join(select_cols)} FROM employees_table WHERE 1=1"
        params = []
        if branch and branch_id_col:
            query += f" AND {branch_id_col} = ?"
            params.append(str(branch))
        if governorate and governorate_col:
            query += f" AND {governorate_col} = ?"
            params.append(governorate)
        query += f" ORDER BY {name_col or employee_id_col}"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        result = []
        for row in rows:
            eid = row[0]
            name = row[1] if name_col and len(row) > 1 else (str(eid) if eid is not None else None)
            if eid is not None:
                result.append({"employee_id": int(eid) if isinstance(eid, (int, float)) else eid, "name": name or f"Employee {eid}"})
        # Always include Employee ID 0 (Security Man) in the list
        if not any(r.get("employee_id") == 0 for r in result):
            result.append({"employee_id": 0, "name": "Security Man"})
        result.sort(key=lambda r: (r["employee_id"], r.get("name", "")))
        conn.close()
        return result
    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        return [{"employee_id": 0, "name": "Security Man"}]

# ========== SHUTTER STATE ENDPOINTS ==========
@app.get("/shutter/branches")
def get_shutter_branches():
    df = load_shutter_data()
    branch_ids = df["Branch ID"].dropna().unique().tolist()
    return sorted([int(bid) if isinstance(bid, str) else int(bid) for bid in branch_ids])

@app.get("/shutter/branch-names")
def get_shutter_branch_names(region: Optional[str] = None, area: Optional[str] = None, governorate: Optional[str] = None):
    area_value = _resolve_area(area, governorate)
    return _get_branch_name_options(region=region, area=area_value)

@app.get("/shutter/areas")
def get_shutter_areas(region: Optional[str] = None):
    return get_areas(region=region)


@app.get("/shutter/regions")
def get_shutter_regions():
    return get_regions()


@app.get("/shutter/governorates")
def get_shutter_governorates():
    # Backward-compatible alias for areas
    return get_areas()

@app.get("/shutter/data")
def get_shutter_data(
    branch: Optional[int] = None,
    date: Optional[str] = None,
    event: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    governorate: Optional[str] = None
):
    try:
        df = load_shutter_data()
        
        if df.empty:
            return []
        
        # Parse date from ISO format or direct date (handle string or datetime from DB)
        if "Date" in df.columns:
            df["Date_parsed"] = pd.to_datetime(df["Date"], errors='coerce').dt.date
            # Drop rows where date parsing failed so they don't break filters
            df = df[df["Date_parsed"].notna()].copy()
        
        # Filter by governorate (case-insensitive, strip whitespace)
        if governorate and "Governorate" in df.columns:
            gov_norm = str(governorate).strip().lower()
            df = df[df["Governorate"].astype(str).str.strip().str.lower() == gov_norm]
        
        # Filter by branch (normalize: strip, compare as string; handle int/str in DB)
        if branch is not None and "Branch ID" in df.columns:
            branch_str = str(branch).strip()
            df["_branch_norm"] = df["Branch ID"].astype(str).str.strip()
            df = df[df["_branch_norm"] == branch_str].drop(columns=["_branch_norm"], errors="ignore")
        
        if date:
            try:
                if 'T' in date:
                    target_date = pd.to_datetime(date.split('T')[0]).date()
                else:
                    target_date = pd.to_datetime(date).date()
                if "Date_parsed" in df.columns:
                    df = df[df["Date_parsed"] == target_date]
            except Exception:
                pass
        elif start_date and end_date:
            # Date range filter
            try:
                if 'T' in start_date:
                    start = pd.to_datetime(start_date.split('T')[0]).date()
                else:
                    start = pd.to_datetime(start_date).date()
                if 'T' in end_date:
                    end = pd.to_datetime(end_date.split('T')[0]).date()
                else:
                    end = pd.to_datetime(end_date).date()
                if "Date_parsed" in df.columns:
                    df = df[(df["Date_parsed"] >= start) & (df["Date_parsed"] <= end)]
            except Exception:
                pass
        if event and "event" in df.columns:
            # Match event case-insensitively; "open" matches "Opened"/"open", "closed" matches "Closed"/"closed"
            event_lower = str(event).strip().lower()
            df = df[df["event"].astype(str).str.strip().str.lower().str.contains(event_lower, na=False)]
        
        if df.empty:
            return []
        
        # Return all columns (drop temporary Date_parsed if present to avoid exposing it)
        out = df.drop(columns=["Date_parsed"], errors="ignore")
        return out.to_dict(orient="records")
    except Exception as e:
        # Log the error for debugging
        import traceback
        print(f"Error in get_shutter_data: {e}")
        print(traceback.format_exc())
        return []

@app.get("/shutter/dates")
def get_shutter_dates(branch: Optional[int] = None, governorate: Optional[str] = None):
    try:
        conn = get_db_connection()
        table_name = _shutter_table_name(conn)
        if not table_name:
            conn.close()
            return []
        # Read dates directly from database (support shutter_table or shutter_state)
        query = f"SELECT DISTINCT date, branch_id FROM {table_name} WHERE date IS NOT NULL"
        params = []
        if branch:
            query += " AND branch_id = ?"
            params.append(str(branch))
        df = pd.read_sql_query(query, conn, params=params)
        conn.close()
        
        if df.empty or "date" not in df.columns:
            return []
        
        # Parse dates
        df["date_parsed"] = pd.to_datetime(df["date"], errors='coerce').dt.date
        df = df.dropna(subset=["date_parsed"])
        
        if df.empty:
            return []
        
        dates = sorted(df["date_parsed"].unique())
        return [d.isoformat() if hasattr(d, 'isoformat') else str(d) for d in dates]
    except Exception as e:
        # Log the error for debugging
        import traceback
        print(f"Error in get_shutter_dates: {e}")
        print(traceback.format_exc())
        return []

@app.get("/shutter/events")
def get_shutter_events(branch: Optional[int] = None, date: Optional[str] = None, governorate: Optional[str] = None):
    df = load_shutter_data()
    
    if "Date" in df.columns:
        df["Date_parsed"] = pd.to_datetime(df["Date"]).dt.date
    
    if governorate and "Governorate" in df.columns:
        df = df[df["Governorate"] == governorate]
    if branch:
        # Branch ID in DB is VARCHAR, so compare as string
        df = df[df["Branch ID"].astype(str) == str(branch)]
    if date:
        try:
            if 'T' in date:
                target_date = pd.to_datetime(date.split('T')[0]).date()
            else:
                target_date = pd.to_datetime(date).date()
            df = df[df["Date_parsed"] == target_date]
        except:
            pass
    
    if "event" in df.columns:
        return sorted(df["event"].dropna().unique().tolist())
    return []

@app.get("/shutter/closed-branches")
def get_closed_branches(date: str, governorate: Optional[str] = None):
    """
    Get branches from branch_table that don't have an 'open' event on the selected date.
    These are considered closed branches.
    """
    conn = get_db_connection()
    
    try:
        # Parse date
        if 'T' in date:
            target_date = pd.to_datetime(date.split('T')[0]).date()
        else:
            target_date = pd.to_datetime(date).date()
        
        # Get all branches from branch_table
        query_branches = "SELECT branch_id, branch_name FROM branch_table"
        if governorate:
            query_branches += f" WHERE governorate = '{governorate}'"
        
        df_branches = pd.read_sql_query(query_branches, conn)
        
        # Get branches that have 'open' event on the selected date
        table_name = _shutter_table_name(conn)
        if not table_name:
            conn.close()
            return []
        # Support event_type or event column name
        cursor = conn.cursor()
        cursor.execute(f"PRAGMA table_info({table_name})")
        cols = [r[1].lower() for r in cursor.fetchall()]
        event_col = "event_type" if "event_type" in cols else "event" if "event" in cols else None
        if not event_col:
            conn.close()
            return []
        query_open = f"SELECT DISTINCT branch_id FROM {table_name} WHERE date = ? AND LOWER({event_col}) LIKE '%open%'"
        df_open = pd.read_sql_query(query_open, conn, params=(target_date,))
        open_branch_ids = set(df_open["branch_id"].astype(str).tolist())
        
        # Find branches that don't have an open event (closed branches)
        closed_branches = []
        for _, row in df_branches.iterrows():
            branch_id_str = str(row["branch_id"])
            if branch_id_str not in open_branch_ids:
                branch_name = row["branch_name"] if pd.notna(row["branch_name"]) else get_branch_name(row["branch_id"])
                closed_branches.append({
                    "Branch ID": int(row["branch_id"]),
                    "Branch Name": branch_name
                })
        
        conn.close()
        return closed_branches
    except Exception as e:
        conn.close()
        return []

# ========== CUSTOMERS ENDPOINTS ==========
@app.get("/customers/branches")
def get_customer_branches():
    df = load_customer_data()
    branch_ids = df["Branch ID"].dropna().unique().tolist()
    return sorted([int(bid) if isinstance(bid, str) else int(bid) for bid in branch_ids])

@app.get("/customers/branch-names")
def get_customer_branch_names(region: Optional[str] = None, area: Optional[str] = None, governorate: Optional[str] = None):
    area_value = _resolve_area(area, governorate)
    return _get_branch_name_options(region=region, area=area_value)

@app.get("/customers/areas")
def get_customer_areas(region: Optional[str] = None):
    return get_areas(region=region)


@app.get("/customers/regions")
def get_customer_regions():
    return get_regions()


@app.get("/customers/governorates")
def get_customer_governorates():
    # Backward-compatible alias for areas
    return get_areas()

@app.get("/customers/data")
def get_customer_data(
    branch: Optional[int] = None,
    date: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    governorate: Optional[str] = None
):
    try:
        from datetime import datetime as dt, timedelta
        conn = get_db_connection()

        query = """
            SELECT 
                branch_id as "Branch ID",
                customer_id as "customer ID",
                service_time as "service time",
                waiting_time as "waiting time",
                first_time_seen as "visit start time",
                last_time_seen as "service end time",
                date as "Date"
            FROM customer_table
            WHERE 1=1
        """
        params = []
        operational_single_date = False
        date_str_for_op = None

        if branch:
            query += " AND branch_id = ?"
            params.append(str(branch))

        if date:
            try:
                date_str = date.split('T')[0] if 'T' in date else date
                day_x_plus_1 = (dt.strptime(date_str, "%Y-%m-%d").date() + timedelta(days=1)).strftime("%Y-%m-%d")
                query += " AND (date = ? OR date = ?)"
                params.extend([date_str, day_x_plus_1])
                operational_single_date = True
                date_str_for_op = date_str
            except Exception:
                date_str = date.split('T')[0] if date and 'T' in date else (date or '')
                query += " AND date = ?"
                params.append(date_str)
        elif start_date and end_date:
            try:
                if 'T' in start_date:
                    start_str = start_date.split('T')[0]
                else:
                    start_str = start_date
                if 'T' in end_date:
                    end_str = end_date.split('T')[0]
                else:
                    end_str = end_date
                if start_str == end_str:
                    day_x_plus_1 = (dt.strptime(start_str, "%Y-%m-%d").date() + timedelta(days=1)).strftime("%Y-%m-%d")
                    query += " AND (date = ? OR date = ?)"
                    params.extend([start_str, day_x_plus_1])
                    operational_single_date = True
                    date_str_for_op = start_str
                else:
                    query += " AND date >= ? AND date <= ?"
                    params.append(start_str)
                    params.append(end_str)
            except Exception:
                pass

        df = pd.read_sql_query(query, conn, params=params)
        conn.close()

        if df.empty:
            return []

        df = filter_customer_data_raw(df, filter_db=FILTER_DB)
        if df.empty:
            return []

        if operational_single_date and date_str_for_op:
            df["visit start time"] = pd.to_datetime(df["visit start time"], errors="coerce")
            df["service end time"] = pd.to_datetime(df["service end time"], errors="coerce")
            df = filter_customers_to_operational_window(df, date_str_for_op)
        if df.empty:
            return []

        # Assign operational date and aggregate by (Branch ID, customer ID, operational day)
        visit_start = pd.to_datetime(df["visit start time"], errors="coerce")
        df["_op_date"] = visit_start.apply(
            lambda t: operational_date_from_timestamp(t) if pd.notna(t) else None
        )
        if "Date" in df.columns:
            df["_op_date"] = df["_op_date"].fillna(pd.to_datetime(df["Date"], errors="coerce").dt.date)
        df = df[df["_op_date"].notna()].copy()
        if df.empty:
            return []

        grouped = df.groupby(["Branch ID", "customer ID", "_op_date"], dropna=False).agg({
            "service time": "sum",
            "waiting time": "sum",
            "visit start time": "min",
            "service end time": "max",
        }).reset_index()
        grouped = grouped.rename(columns={"_op_date": "Date"})
        df = grouped

        if "service time" in df.columns:
            df["service time"] = df["service time"] * 60
        if "waiting time" in df.columns:
            df["waiting time"] = df["waiting time"] * 60

        df["Governorate"] = GOVERNORATE
        df["Branch Name"] = df["Branch ID"].apply(get_branch_name)

        if "Date" in df.columns:
            df["Date"] = pd.to_datetime(df["Date"], errors='coerce').dt.strftime("%Y-%m-%dT00:00:00")
        if "visit start time" in df.columns:
            df["visit start time"] = pd.to_datetime(df["visit start time"], errors='coerce').dt.strftime("%Y-%m-%dT%H:%M:%S")
        if "service end time" in df.columns:
            df["service end time"] = pd.to_datetime(df["service end time"], errors='coerce').dt.strftime("%Y-%m-%dT%H:%M:%S")

        if governorate and "Governorate" in df.columns:
            df = df[df["Governorate"] == governorate]

        if df.empty:
            return []
        return df.to_dict(orient="records")
    except Exception as e:
        # Log the error for debugging
        import traceback
        print(f"Error in get_customer_data: {e}")
        print(traceback.format_exc())
        return []


def filter_customers_to_operational_window(df: pd.DataFrame, date_str: str) -> pd.DataFrame:
    """
    Keep only customer rows whose visit overlaps the operational day for date_str:
    day X 7:00 AM to day X+1 3:00 AM. Requires 'visit start time' and 'service end time' as datetimes.
    """
    if df.empty:
        return df
    from datetime import datetime as dt, timedelta
    op_start = pd.Timestamp(f"{date_str} 07:00:00")
    day_x_plus_1 = (dt.strptime(date_str, "%Y-%m-%d").date() + timedelta(days=1)).strftime("%Y-%m-%d")
    op_end = pd.Timestamp(f"{day_x_plus_1} 03:00:00")
    first_col = "visit start time" if "visit start time" in df.columns else "first_time_seen"
    last_col = "service end time" if "service end time" in df.columns else "last_time_seen"
    if first_col not in df.columns or last_col not in df.columns:
        return df
    start = pd.to_datetime(df[first_col], errors="coerce")
    end = pd.to_datetime(df[last_col], errors="coerce")
    overlap = (start < op_end) & (end > op_start)
    return df.loc[overlap].copy()


def calculate_idle_time(df_customers, branch_id: int, date_str: str):
    """
    Calculate idle time (periods with no customers) for a branch on a specific date.
    Timeline: day X 7:00 AM to day X+1 3:00 AM (operational day = 20 hours = 1200 minutes).
    Returns total idle time in minutes and timeline segments.
    """
    try:
        from datetime import datetime as dt, timedelta
        op_date_x = dt.strptime(date_str, "%Y-%m-%d").date()
        op_date_x_plus_1 = op_date_x + timedelta(days=1)
        # Operational window: 0 = 7:00 day X, 1020 = midnight (00:00 day X+1), 1200 = 3:00 day X+1 (20 hours)
        WORK_START = 0     # 7:00 day X
        WORK_END = 1200   # 3:00 day X+1 (20 hours)
        MIDNIGHT_OP = 17 * 60  # 1020 = 00:00 day X+1 in operational minutes from 7:00 day X

        def datetime_to_op_minutes(t):
            if pd.isna(t):
                return None
            t = pd.to_datetime(t)
            d = t.date()
            m = t.hour * 60 + t.minute
            if d == op_date_x:
                if m < 7 * 60:  # before 7:00
                    return WORK_START
                if m >= 24 * 60:
                    return MIDNIGHT_OP  # midnight
                return m - 7 * 60
            if d == op_date_x_plus_1:
                if m >= 3 * 60:  # 3:00 or later
                    return WORK_END
                return MIDNIGHT_OP + m  # 00:00 = 1020, 03:00 = 1200
            return None  # outside operational window

        def op_minutes_to_time_label(op_min):
            """Convert operational minutes (0-1200) to display time string."""
            if op_min < MIDNIGHT_OP:
                total = 7 * 60 + op_min
                if total >= 1440:
                    return "00:00"
                return f"{total // 60:02d}:{total % 60:02d}"
            # next day 00:00–03:00
            h = (op_min - MIDNIGHT_OP) // 60
            m = (op_min - MIDNIGHT_OP) % 60
            return f"{h:02d}:{m:02d}"

        # Filter for the specific branch
        df_filtered = df_customers[
            (df_customers["Branch ID"] == branch_id)
        ].copy()

        if df_filtered.empty:
            return {
                "total_idle_minutes": WORK_END - WORK_START,
                "total_active_minutes": 0,
                "timeline_segments": [{
                    "type": "idle",
                    "start_minutes": WORK_START,
                    "end_minutes": WORK_END,
                    "start_time": "07:00",
                    "end_time": "03:00"
                }]
            }

        # Build intervals in operational minutes (0–1200). Cap end at midnight when visit spans two calendar days.
        intervals = []
        for _, row in df_filtered.iterrows():
            if pd.notna(row.get("visit start time")) and pd.notna(row.get("service end time")):
                try:
                    t_start = pd.to_datetime(row["visit start time"])
                    t_end = pd.to_datetime(row["service end time"])
                    start_op = datetime_to_op_minutes(row["visit start time"])
                    end_op = datetime_to_op_minutes(row["service end time"])
                    if start_op is not None and end_op is not None:
                        if t_end.date() > t_start.date():
                            end_op = min(end_op, MIDNIGHT_OP)
                        if start_op < end_op:
                            intervals.append((start_op, end_op))
                except Exception:
                    continue

        if not intervals:
            return {
                "total_idle_minutes": WORK_END - WORK_START,
                "total_active_minutes": 0,
                "timeline_segments": [{
                    "type": "idle",
                    "start_minutes": WORK_START,
                    "end_minutes": WORK_END,
                    "start_time": "07:00",
                    "end_time": "03:00"
                }]
            }

        # Sort and merge overlapping intervals
        intervals.sort(key=lambda x: x[0])
        merged = []
        current_start, current_end = intervals[0]
        for start, end in intervals[1:]:
            if start <= current_end:
                current_end = max(current_end, end)
            else:
                merged.append((current_start, current_end))
                current_start, current_end = start, end
        merged.append((current_start, current_end))

        # Clamp merged intervals to [WORK_START, WORK_END] and compute idle/active segments
        timeline_segments = []
        total_active = 0
        total_idle = 0
        prev_end = WORK_START

        for start, end in merged:
            start_norm = max(WORK_START, min(WORK_END, start))
            end_norm = max(WORK_START, min(WORK_END, end))
            if end_norm <= start_norm:
                continue
            if start_norm > prev_end:
                idle_duration = start_norm - prev_end
                total_idle += idle_duration
                timeline_segments.append({
                    "type": "idle",
                    "start_minutes": prev_end,
                    "end_minutes": start_norm,
                    "start_time": op_minutes_to_time_label(prev_end),
                    "end_time": op_minutes_to_time_label(start_norm)
                })
            active_duration = end_norm - start_norm
            total_active += active_duration
            timeline_segments.append({
                "type": "active",
                "start_minutes": start_norm,
                "end_minutes": end_norm,
                "start_time": op_minutes_to_time_label(start_norm),
                "end_time": op_minutes_to_time_label(end_norm)
            })
            prev_end = end_norm

        if prev_end < WORK_END:
            idle_duration = WORK_END - prev_end
            total_idle += idle_duration
            timeline_segments.append({
                "type": "idle",
                "start_minutes": prev_end,
                "end_minutes": WORK_END,
                "start_time": op_minutes_to_time_label(prev_end),
                "end_time": op_minutes_to_time_label(WORK_END)
            })

        return {
            "total_idle_minutes": total_idle,
            "total_active_minutes": total_active,
            "timeline_segments": timeline_segments
        }
    except Exception as e:
        import traceback
        print(f"Error in calculate_idle_time: {e}")
        print(traceback.format_exc())
        return {
            "total_idle_minutes": 0,
            "total_active_minutes": 0,
            "timeline_segments": []
        }

@app.get("/customers/idle-time")
def get_idle_time(
    branch: int,
    date: str,
    governorate: Optional[str] = None
):
    """
    Get idle time (periods with no customers) for a branch on a specific date.
    Timeline for date X spans day X 9:00 AM to day X+1 2:00 AM.
    Returns total idle time and timeline segments.
    """
    try:
        conn = get_db_connection()

        # Parse date (day X)
        if 'T' in date:
            date_str = date.split('T')[0]
        else:
            date_str = date

        # Next calendar day (X+1) for post-midnight segment
        from datetime import datetime as dt, timedelta
        try:
            day_x = dt.strptime(date_str, "%Y-%m-%d").date()
            day_x_plus_1 = (day_x + timedelta(days=1)).strftime("%Y-%m-%d")
        except Exception:
            day_x_plus_1 = date_str  # fallback

        # Get customer data for branch on day X and day X+1 (for 00:00–03:00)
        query = """
            SELECT 
                branch_id as "Branch ID",
                first_time_seen as "visit start time",
                last_time_seen as "service end time",
                date as "Date",
                service_time as "service time",
                waiting_time as "waiting time"
            FROM customer_table
            WHERE branch_id = ? AND (date = ? OR date = ?)
        """
        params = [str(branch), date_str, day_x_plus_1]

        df = pd.read_sql_query(query, conn, params=params)
        conn.close()

        # Apply filtering using global FILTER_DB setting
        if FILTER_DB and not df.empty:
            df = filter_customer_data_raw(df, filter_db=FILTER_DB)

        if df.empty:
            # No customers - entire operational window is idle (7 AM day X to 3 AM day X+1 = 20h)
            return {
                "branch_id": branch,
                "date": date_str,
                "total_idle_minutes": 1200,  # 20 hours
                "total_active_minutes": 0,
                "total_idle_hours": 20.0,
                "timeline_segments": [{
                    "type": "idle",
                    "start_minutes": 0,
                    "end_minutes": 1200,
                    "start_time": "07:00",
                    "end_time": "03:00"
                }]
            }

        # Convert timestamps to datetime
        if "visit start time" in df.columns:
            df["visit start time"] = pd.to_datetime(df["visit start time"], errors='coerce')
        if "service end time" in df.columns:
            df["service end time"] = pd.to_datetime(df["service end time"], errors='coerce')
        if "Date" in df.columns:
            df["Date"] = pd.to_datetime(df["Date"], errors='coerce').dt.date

        # Exclude customers with visit duration > 3 hours (same rule as customer page)
        if "visit start time" in df.columns and "service end time" in df.columns:
            duration_hours = (df["service end time"] - df["visit start time"]).dt.total_seconds() / 3600
            df = df[(duration_hours.isna()) | (duration_hours <= 3)].copy()

        result = calculate_idle_time(df, branch, date_str)
        result["branch_id"] = branch
        result["date"] = date_str
        result["total_idle_hours"] = result["total_idle_minutes"] / 60.0

        return result
    except Exception as e:
        import traceback
        print(f"Error in get_idle_time: {e}")
        print(traceback.format_exc())
        return {
            "branch_id": branch,
            "date": date,
            "total_idle_minutes": 0,
            "total_active_minutes": 0,
            "total_idle_hours": 0.0,
            "timeline_segments": []
        }

@app.get("/customers/dates")
def get_customer_dates(branch: Optional[int] = None, governorate: Optional[str] = None):
    try:
        conn = get_db_connection()
        
        # Read dates directly from database
        query = "SELECT DISTINCT date, branch_id FROM customer_table WHERE date IS NOT NULL"
        params = []
        
        if branch:
            query += " AND branch_id = ?"
            params.append(str(branch))
        
        df = pd.read_sql_query(query, conn, params=params)
        conn.close()
        
        if df.empty or "date" not in df.columns:
            return []
        
        # Parse dates
        df["date_parsed"] = pd.to_datetime(df["date"], errors='coerce').dt.date
        df = df.dropna(subset=["date_parsed"])
        
        if df.empty:
            return []
        
        dates = sorted(df["date_parsed"].unique())
        return [d.isoformat() if hasattr(d, 'isoformat') else str(d) for d in dates]
    except Exception as e:
        # Log the error for debugging
        import traceback
        print(f"Error in get_customer_dates: {e}")
        print(traceback.format_exc())
        return []

@app.get("/customers/count")
def get_customer_count(branch: Optional[int] = None, date: Optional[str] = None):
    from datetime import datetime as dt, timedelta
    if date:
        try:
            date_str = date.split('T')[0] if 'T' in date else date
            day_x_plus_1 = (dt.strptime(date_str, "%Y-%m-%d").date() + timedelta(days=1)).strftime("%Y-%m-%d")
            conn = get_db_connection()
            query = """
                SELECT branch_id as "Branch ID", customer_id as "customer ID",
                    first_time_seen as "visit start time", last_time_seen as "service end time",
                    date as "Date", service_time as "service time", waiting_time as "waiting time"
                FROM customer_table
                WHERE (date = ? OR date = ?)
            """
            params = [date_str, day_x_plus_1]
            if branch is not None:
                query = query.replace("WHERE (", "WHERE branch_id = ? AND (")
                params.insert(0, str(branch))
            df = pd.read_sql_query(query, conn, params=params)
            conn.close()
            if df.empty:
                return {"count": 0}
            df = filter_customer_data_raw(df, filter_db=FILTER_DB)
            df["visit start time"] = pd.to_datetime(df["visit start time"], errors="coerce")
            df["service end time"] = pd.to_datetime(df["service end time"], errors="coerce")
            df = filter_customers_to_operational_window(df, date_str)
            if df.empty:
                return {"count": 0}
            return {"count": df["customer ID"].nunique()}
        except Exception:
            pass
    df = load_customer_data()
    if "Date" in df.columns:
        df["Date_parsed"] = pd.to_datetime(df["Date"]).dt.date
    if branch is not None:
        df = df[df["Branch ID"].astype(str) == str(branch)]
    if date:
        try:
            if 'T' in date:
                target_date = pd.to_datetime(date.split('T')[0]).date()
            else:
                target_date = pd.to_datetime(date).date()
            df = df[df["Date_parsed"] == target_date]
        except Exception:
            pass
    if "customer ID" in df.columns:
        return {"count": df["customer ID"].nunique()}
    if "Customer ID" in df.columns:
        return {"count": df["Customer ID"].nunique()}
    return {"count": len(df)}

# ========== ALERTS ENDPOINTS ==========
def load_alert_data():
    """Load alert data from alert_table"""
    conn = get_db_connection()
    query = """
        SELECT 
            branch_id as "Branch ID",
            alert_type as "Alert Type",
            date as "Date",
            timestamp as "Timestamp"
        FROM alert_table
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    # Add hardcoded fields
    df["Governorate"] = GOVERNORATE
    df["Branch Name"] = df["Branch ID"].apply(get_branch_name)
    
    # Convert date to ISO format string if exists
    if "Date" in df.columns and df["Date"].notna().any():
        df["Date"] = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%dT00:00:00")
    
    # Apply filtering using global FILTER_DB setting
    df = filter_alert_data(df, filter_db=FILTER_DB)
    
    return df

@app.get("/alerts/branches")
def get_alert_branches():
    df = load_alert_data()
    branch_ids = df["Branch ID"].dropna().unique().tolist()
    return sorted([int(bid) if isinstance(bid, str) else int(bid) for bid in branch_ids])

@app.get("/alerts/branch-names")
def get_alert_branch_names(region: Optional[str] = None, area: Optional[str] = None, governorate: Optional[str] = None):
    area_value = _resolve_area(area, governorate)
    return _get_branch_name_options(region=region, area=area_value)

@app.get("/alerts/areas")
def get_alert_areas(region: Optional[str] = None):
    return get_areas(region=region)


@app.get("/alerts/regions")
def get_alert_regions():
    return get_regions()


@app.get("/alerts/governorates")
def get_alert_governorates():
    # Backward-compatible alias for areas
    return get_areas()

@app.get("/alerts/dates")
def get_alert_dates(branch: Optional[int] = None, governorate: Optional[str] = None):
    try:
        conn = get_db_connection()
        
        # Read dates directly from database
        query = "SELECT DISTINCT date, branch_id FROM alert_table WHERE date IS NOT NULL"
        params = []
        
        if branch:
            query += " AND branch_id = ?"
            params.append(str(branch))
        
        df = pd.read_sql_query(query, conn, params=params)
        conn.close()
        
        if df.empty or "date" not in df.columns:
            return []
        
        # Parse dates
        df["date_parsed"] = pd.to_datetime(df["date"], errors='coerce').dt.date
        df = df.dropna(subset=["date_parsed"])
        
        if df.empty:
            return []
        
        dates = sorted(df["date_parsed"].unique())
        return [d.isoformat() if hasattr(d, 'isoformat') else str(d) for d in dates]
    except Exception as e:
        # Log the error for debugging
        import traceback
        print(f"Error in get_alert_dates: {e}")
        print(traceback.format_exc())
        return []

@app.get("/alerts/data")
def get_alert_data(
    branch: Optional[int] = None,
    date: Optional[str] = None,
    governorate: Optional[str] = None
):
    """
    Get alert counts grouped by alert_type, filtered by branch and date.
    Returns a list of dictionaries with alert_type and count.
    """
    df = load_alert_data()
    
    # Parse date from ISO format
    if "Date" in df.columns:
        df["Date_parsed"] = pd.to_datetime(df["Date"]).dt.date
    
    # Filter
    if governorate and "Governorate" in df.columns:
        df = df[df["Governorate"] == governorate]
    if branch:
        # Branch ID in DB is INTEGER, so compare as string for compatibility
        df = df[df["Branch ID"].astype(str) == str(branch)]
    if date:
        try:
            # Handle ISO format (2025-12-20T00:00:00) or YYYY-MM-DD
            if 'T' in date:
                target_date = pd.to_datetime(date.split('T')[0]).date()
            else:
                target_date = pd.to_datetime(date).date()
            df = df[df["Date_parsed"] == target_date]
        except:
            pass
    
    # Group by alert_type and count
    if "Alert Type" in df.columns:
        alert_counts = df["Alert Type"].value_counts().reset_index()
        alert_counts.columns = ["alert_type", "count"]
        return alert_counts.to_dict(orient="records")
    else:
        return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, port=8000, reload=False)

