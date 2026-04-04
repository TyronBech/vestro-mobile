import { apiClient } from "../client";

export interface ProfileResponse {
  id: string;
  name: string;
  role: string;
  email: string;
}

export const fetchProfile = () => apiClient<ProfileResponse>("/profile");
