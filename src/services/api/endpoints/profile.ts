import { apiClient } from "../client";
import { ApiResponse } from "./auth";

export interface ProfileResponse {
  id: string;
  email: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  avatarUrl?: string | null;
  currency: string;
  spendingLimit: number;
  biometricsEnabled: boolean;
  panicModeEnabled: boolean;
  twoFactorEnabled: boolean;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
}

export const fetchProfile = () => apiClient<ApiResponse<ProfileResponse>>("/profile");

