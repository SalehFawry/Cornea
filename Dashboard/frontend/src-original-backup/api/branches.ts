import client from "./client";
import type { Branch, Employee, ShutterSchedule } from "../types";

export async function listBranches(): Promise<Branch[]> {
  const { data } = await client.get<Branch[]>("/api/v1/branches");
  return data;
}

export async function getBranch(branchId: number): Promise<Branch> {
  const { data } = await client.get<Branch>(`/api/v1/branches/${branchId}`);
  return data;
}

export async function listEmployees(branchId: number): Promise<Employee[]> {
  const { data } = await client.get<Employee[]>(
    `/api/v1/branches/${branchId}/employees`,
  );
  return data;
}

export async function getShutterSchedule(
  branchId: number,
  day: string,
): Promise<ShutterSchedule> {
  const { data } = await client.get<ShutterSchedule>(
    `/api/v1/branches/${branchId}/shutter-schedule`,
    { params: { day } },
  );
  return data;
}
