import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { apiLogin, apiSignup, LoginParams, SignupParams, UserResponse } from "../services/api/endpoints/auth";
import { fetchProfile } from "../services/api/endpoints/profile";

const TOKEN_KEY = "vestro_access_token";

interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  
  initialize: () => Promise<void>;
  login: (params: LoginParams) => Promise<void>;
  signup: (params: SignupParams) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  initialize: async () => {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (storedToken) {
        set({ accessToken: storedToken });
        // Fetch profile to verify token and load user data
        const profileResponse = await fetchProfile();
        set({
          user: profileResponse.data,
          isAuthenticated: true,
        });
      }
    } catch (err) {
      // If token is invalid or expired, clear it
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } catch (e) {
        console.error("Failed to clear invalid token", e);
      }
      set({ accessToken: null, user: null, isAuthenticated: false });
    }
  },

  login: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await apiLogin(params);
      const { token, user } = response.data;

      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        set({
          accessToken: token,
          user,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        set({ loading: false });
      }
    } catch (err: any) {
      set({ error: err.message || "Login failed", loading: false });
      throw err;
    }
  },

  signup: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await apiSignup(params);
      const { token, user } = response.data;

      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        set({
          accessToken: token,
          user,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        set({ loading: false });
      }
    } catch (err: any) {
      set({ error: err.message || "Signup failed", loading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (err) {
      console.error("Failed to delete token on logout", err);
    }
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));
