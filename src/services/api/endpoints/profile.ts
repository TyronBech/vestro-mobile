import { apiClient } from "../client";
import { ApiResponse, ProfileResponse } from "../../../types";

export const fetchProfile = () => apiClient<ApiResponse<ProfileResponse>>("/profile");

