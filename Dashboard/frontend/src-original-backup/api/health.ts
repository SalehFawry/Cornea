import client from "./client";
import type { HealthResponse } from "../types";

export async function checkHealth(): Promise<HealthResponse> {
  const { data } = await client.get<HealthResponse>("/health");
  return data;
}

export async function checkReady(): Promise<HealthResponse> {
  const { data } = await client.get<HealthResponse>("/ready");
  return data;
}
