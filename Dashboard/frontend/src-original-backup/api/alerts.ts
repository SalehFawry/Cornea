import client from "./client";
import type { Alert, AlertInfo } from "../types";

interface AlertParams {
  date?: string;
  alert_type?: string;
  limit?: number;
  offset?: number;
}

export async function getAlerts(
  branchId: number,
  params: AlertParams = {},
): Promise<Alert[]> {
  const { data } = await client.get<Alert[]>(
    `/api/v1/branches/${branchId}/alerts`,
    { params: { limit: 500, ...params } },
  );
  return data;
}

export async function getAlertInfo(): Promise<AlertInfo[]> {
  const { data } = await client.get<AlertInfo[]>("/api/v1/alerts/info");
  return data;
}
