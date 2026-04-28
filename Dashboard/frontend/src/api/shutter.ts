import client from "./client";
import type { ShutterEvent, ShutterStatus } from "../types";

interface ShutterEventParams {
  date?: string;
  event_type?: string;
  limit?: number;
  offset?: number;
}

export async function getShutterEvents(
  branchId: number,
  params: ShutterEventParams = {},
): Promise<ShutterEvent[]> {
  const { data } = await client.get<ShutterEvent[]>(
    `/api/v1/branches/${branchId}/shutter/events`,
    { params: { limit: 500, ...params } },
  );
  return data;
}

export async function getShutterStatus(
  branchId: number,
): Promise<ShutterStatus> {
  const { data } = await client.get<ShutterStatus>(
    `/api/v1/branches/${branchId}/shutter/status`,
  );
  return data;
}
