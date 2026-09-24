// ── Branch ──────────────────────────────────────────────────────────
export interface Branch {
  branch_id: number;
  branch_name: string;
  region?: string;
  area?: string;
  governorate?: string;
}

export interface BranchOption {
  label: string;
  value: number;
}

// ── Employee ────────────────────────────────────────────────────────
export interface Employee {
  employee_id: number;
  branch_id: number;
  name?: string;
}

// ── Attendance ──────────────────────────────────────────────────────
export interface AttendanceRecord {
  employee_id: number;
  branch_id: number;
  date: string;
  first_time_seen: string | null;
  last_time_seen: string | null;
  working_hours: number;
  disk_hours?: number;
  total_hours?: number;
  branch_name?: string;
}

export interface AttendanceSummary {
  employee_id: number;
  total_hours: number;
  avg_hours: number;
  days_present: number;
  first_time_seen?: string;
  last_time_seen?: string;
}

// ── Customer ────────────────────────────────────────────────────────
export interface CustomerRecord {
  customer_id: number;
  branch_id: number;
  date: string;
  visit_start_time: string | null;
  service_end_time: string | null;
  waiting_time: number;
  service_time: number;
  branch_name?: string;
}

export interface CustomerSummary {
  date: string;
  branch_id: number;
  total_customers: number;
  avg_waiting_time: number;
  avg_service_time: number;
}

// ── Shutter ─────────────────────────────────────────────────────────
export interface ShutterEvent {
  id?: number;
  branch_id: number;
  event_type: string;
  timestamp: string;
  date?: string;
  /** Shutter-model probability as the node reported it; null on synthetic opens. */
  confidence?: string | null;
  /** Weights file the node was running; null on synthetic opens. */
  model_version?: string | null;
}

export interface ShutterStatus {
  branch_id: number;
  latest_event_type: string | null;
  latest_timestamp: string | null;
}

// ── Cash Door ───────────────────────────────────────────────────────
export interface CashDoorEvent {
  id?: number;
  branch_id: number;
  event_type: string;
  timestamp: string;
  date?: string;
}

export interface CashDoorStatus {
  branch_id: number;
  latest_event_type: string | null;
  latest_timestamp: string | null;
}

// ── Alert ───────────────────────────────────────────────────────────
export interface Alert {
  id?: number;
  branch_id: number;
  alert_type: string;
  timestamp: string;
  date?: string;
  message?: string;
}

export interface AlertInfo {
  alert_type: string;
  description?: string;
}

export interface AlertCountByType {
  alert_type: string;
  count: number;
}

// ── Shutter Schedule ────────────────────────────────────────────────
export interface ShutterSchedule {
  branch_id: number;
  day: string;
  opening_time: string;
  partial_time?: string;
  closing_time: string;
}

// ── Health ──────────────────────────────────────────────────────────
export interface HealthResponse {
  status: string;
}

// ── Pagination ──────────────────────────────────────────────────────
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// ── Filter State ────────────────────────────────────────────────────
export interface FilterState {
  branchId: number | null;
  startDate: string;
  endDate: string;
  region: string | null;
  area: string | null;
}
