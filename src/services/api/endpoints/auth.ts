import { apiClient } from "../client";

export interface UserResponse {
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
  lastActiveAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSuccessPayload {
  user: UserResponse;
  token: string;
  requires2fa?: boolean;
}

export interface ApiResponse<T> {
  data: T;
}

export interface LoginParams {
  email: string;
  password?: string;
}

export interface SignupParams {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
}

export const apiLogin = (params: LoginParams) =>
  apiClient<ApiResponse<AuthSuccessPayload>>("/auth/login", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const apiSignup = (params: SignupParams) =>
  apiClient<ApiResponse<AuthSuccessPayload>>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(params),
  });
