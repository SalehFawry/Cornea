import client from "./client";
import type { CashDoorEvent, CashDoorStatus } from "../types";

interface CashDoorEventParams {
  date?: string;
  event_type?: string;
  limit?: number;
  offset?: number;
}

export async function getCashDoorEvents(
  branchId: number,
  params: CashDoorEventParams = {},
): Promise<CashDoorEvent[]> {
  const { data } = await client.get<CashDoorEvent[]>(
    `/api/v1/branches/${branchId}/cash-door/events`,
    { params: { limit: 500, ...params } },
  );
  return data;
}

export async function getCashDoorStatus(
  branchId: number,
): Promise<CashDoorStatus> {
  const { data } = await client.get<CashDoorStatus>(
    `/api/v1/branches/${branchId}/cash-door/status`,
  );
  return data;
}
