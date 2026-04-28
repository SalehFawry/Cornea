import client from "./client";
import type { CustomerRecord, CustomerSummary } from "../types";

interface CustomerParams {
  date?: string;
  customer_id?: number;
  limit?: number;
  offset?: number;
}

export async function getCustomers(
  branchId: number,
  params: CustomerParams = {},
): Promise<CustomerRecord[]> {
  const { data } = await client.get<CustomerRecord[]>(
    `/api/v1/branches/${branchId}/customers`,
    { params: { limit: 500, ...params } },
  );
  return data;
}

export async function getCustomerSummary(
  branchId: number,
  dateFrom: string,
  dateTo: string,
): Promise<CustomerSummary[]> {
  const { data } = await client.get<CustomerSummary[]>(
    `/api/v1/branches/${branchId}/customers/summary`,
    { params: { date_from: dateFrom, date_to: dateTo } },
  );
  return data;
}
