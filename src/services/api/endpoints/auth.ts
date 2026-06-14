import { apiClient } from "../client";
import { ApiResponse, AuthSuccessPayload, LoginParams, SignupParams } from "../../../types";

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

export const apiVerifySupabase = (params: { supabaseToken: string }) =>
  apiClient<ApiResponse<AuthSuccessPayload>>("/auth/supabase/verify", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const apiForgotPassword = (email: string) =>
  apiClient<ApiResponse<{ success: boolean }>>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const apiResetPassword = (params: { email: string; otp: string; newPassword?: string }) =>
  apiClient<ApiResponse<{ success: boolean }>>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(params),
  });
