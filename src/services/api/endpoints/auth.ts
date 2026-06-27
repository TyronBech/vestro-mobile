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

export const apiResetPassword = (params: { email: string; otp: string; newPassword: string }) =>
  apiClient<ApiResponse<{ success: boolean }>>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const apiEnableBiometrics = () =>
  apiClient<ApiResponse<{ biometricKey: string }>>("/auth/biometrics/enable", {
    method: "POST",
  });

export const apiDisableBiometrics = () =>
  apiClient<ApiResponse<boolean>>("/auth/biometrics/disable", {
    method: "POST",
  });

export const apiBiometricLogin = (params: { userId: string; biometricKey: string }) =>
  apiClient<ApiResponse<AuthSuccessPayload>>("/auth/biometrics/login", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const apiGenerate2fa = () =>
  apiClient<ApiResponse<{ secret: string; otpauthUrl: string }>>("/auth/2fa/generate", {
    method: "POST",
  });

export const apiEnable2fa = (params: { userId: string; token: string }) =>
  apiClient<ApiResponse<boolean>>("/auth/2fa/enable", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const apiDisable2fa = () =>
  apiClient<ApiResponse<boolean>>("/auth/2fa/disable", {
    method: "POST",
  });

export const apiLoginWith2fa = (params: { userId: string; token: string }) =>
  apiClient<ApiResponse<AuthSuccessPayload>>("/auth/2fa/login", {
    method: "POST",
    body: JSON.stringify(params),
  });


