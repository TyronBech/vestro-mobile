import { apiClient } from "../client";
import { ApiResponse, ProfileResponse } from "../../../types";

export const fetchProfile = () => apiClient<ApiResponse<ProfileResponse>>("/profile");

export const apiUpdateProfile = (params: Partial<ProfileResponse>) =>
  apiClient<ApiResponse<ProfileResponse>>("/profile", {
    method: "PATCH",
    body: JSON.stringify(params),
  });


