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
