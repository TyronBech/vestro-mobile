import { apiClient } from "../client";

export interface HealthResponse {
  status: string;
  message: string;
  timestamp: string;
}

export const testBackendConnection = () => apiClient<HealthResponse>("/health");
