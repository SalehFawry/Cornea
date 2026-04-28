import client from "./client";
import type { AttendanceRecord, AttendanceSummary } from "../types";

interface AttendanceParams {
  date?: string;
  employee_id?: number;
  limit?: number;
  offset?: number;
}

export async function getAttendance(
  branchId: number,
  params: AttendanceParams = {},
): Promise<AttendanceRecord[]> {
  const { data } = await client.get<AttendanceRecord[]>(
    `/api/v1/branches/${branchId}/attendance`,
    { params: { limit: 500, ...params } },
  );
  return data;
}

export async function getAttendanceSummary(
  branchId: number,
  dateFrom: string,
  dateTo: string,
): Promise<AttendanceSummary[]> {
  const { data } = await client.get<AttendanceSummary[]>(
    `/api/v1/branches/${branchId}/attendance/summary`,
    { params: { date_from: dateFrom, date_to: dateTo } },
  );
  return data;
}
