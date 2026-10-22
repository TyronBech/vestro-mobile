import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { apiLogin, apiSignup, apiVerifySupabase, apiForgotPassword, apiResetPassword, apiBiometricLogin, apiLoginWith2fa } from "../services/api/endpoints/auth";
import { fetchProfile } from "../services/api/endpoints/profile";
import { SECURE_STORE_KEYS, SECURE_STORE_OPTIONS } from "../services/api/config";
import { AuthState, UserResponse } from "../types";
import { setTokenRefreshedCallback, setUnauthorizedCallback } from "../services/api/client";
import { useUIStore } from "./ui-store";
import { useToastStore } from "./toast-store";

let activeGoogleLoginPromise: Promise<{ requires2fa: boolean; user: UserResponse | null }> | null = null;

// A new login must not write credentials while an earlier logout is deleting them.
let authStorageQueue: Promise<unknown> = Promise.resolve();
function serializeAuthStorage<T>(operation: () => Promise<T>): Promise<T> {
  const result = authStorageQueue.then(operation);
  authStorageQueue = result.catch(() => {});
  return result;
}

async function saveCredentials(token: string, user: UserResponse) {
  await SecureStore.setItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN, token, SECURE_STORE_OPTIONS);
  await SecureStore.setItemAsync(SECURE_STORE_KEYS.USER_PROFILE, JSON.stringify(user), SECURE_STORE_OPTIONS);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  isSessionLocked: false,
  setSessionLocked: (locked) => set({ isSessionLocked: locked }),

  initialize: async () => {
    try {
      const storedToken = await SecureStore.getItemAsync(
        SECURE_STORE_KEYS.ACCESS_TOKEN,
        SECURE_STORE_OPTIONS
      );
      if (storedToken) {
        set({ accessToken: storedToken });

        // Load cached user profile first
        const cachedUserStr = await SecureStore.getItemAsync(
          SECURE_STORE_KEYS.USER_PROFILE,
          SECURE_STORE_OPTIONS
        );
        if (cachedUserStr) {
          const cachedUser = JSON.parse(cachedUserStr);
          set({ user: cachedUser, isAuthenticated: true });
        }

        try {
          // Fetch profile to verify token and load latest user data
          const profileResponse = await fetchProfile();
          set({
            user: profileResponse.data,
            isAuthenticated: true,
          });
          await SecureStore.setItemAsync(
            SECURE_STORE_KEYS.USER_PROFILE,
            JSON.stringify(profileResponse.data),
            SECURE_STORE_OPTIONS
          );
        } catch (fetchErr: any) {
          // If the token is invalid or expired (401)
          if (fetchErr.status === 401) {
            console.log("[Auth Store] Token expired during initialization. Attempting session lock.");
            
            const currentUser = useAuthStore.getState().user;
            if (currentUser) {
              set({ isSessionLocked: true });
              return;
            }
          }
          // For other errors (like network/offline), we keep the cached session as is.
          // If it was a 401 but no cached user was found, propagate to outer catch block to logout.
          if (fetchErr.status === 401) {
            throw fetchErr;
          }
        }
      }
    } catch (err) {
      console.log("[Auth Store] Auth initialization failed, logging out:", err);
      // Clean up all auth stores
      try {
        await SecureStore.deleteItemAsync(
          SECURE_STORE_KEYS.ACCESS_TOKEN,
          SECURE_STORE_OPTIONS
        );
      } catch (e) {}
      try {
        await SecureStore.deleteItemAsync(
          SECURE_STORE_KEYS.USER_PROFILE,
          SECURE_STORE_OPTIONS
        );
      } catch (e) {}
      set({ accessToken: null, user: null, isAuthenticated: false, isSessionLocked: false });
    }
  },

  login: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await apiLogin(params);
      const { token, user, requires2fa } = response.data;

      if (token) {
        await serializeAuthStorage(async () => {
          await saveCredentials(token, user);
          set({ accessToken: token, user, isAuthenticated: true, isSessionLocked: false, loading: false });
        });
        return { requires2fa: false, user };
      } else if (requires2fa) {
        set({ loading: false });
        return { requires2fa: true, user };
      } else {
        set({ loading: false });
        return { requires2fa: false, user: null };
      }
    } catch (err: any) {
      set({ error: err.message || "Login failed", loading: false });
      throw err;
    }
  },

  loginWith2fa: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await apiLoginWith2fa(params);
      const { token, user } = response.data;

      if (token) {
        await serializeAuthStorage(async () => {
          await saveCredentials(token, user);
          set({ accessToken: token, user, isAuthenticated: true, isSessionLocked: false, loading: false });
        });
      } else {
        set({ loading: false });
      }
    } catch (err: any) {
      set({ error: err.message || "2FA verification failed", loading: false });
      throw err;
    }
  },

  signup: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await apiSignup(params);
      const { token, user } = response.data;

      if (token) {
        await serializeAuthStorage(async () => {
          await saveCredentials(token, user);
          set({ accessToken: token, user, isAuthenticated: true, isSessionLocked: false, loading: false });
        });
      } else {
        set({ loading: false });
      }
    } catch (err: any) {
      set({ error: err.message || "Signup failed", loading: false });
      throw err;
    }
  },

  loginWithGoogle: async (supabaseToken) => {
    if (activeGoogleLoginPromise) {
      console.log("[Auth Store] Reusing active Google login promise.");
      return activeGoogleLoginPromise as any;
    }

    activeGoogleLoginPromise = (async () => {
      set({ loading: true, error: null });
      try {
        const response = await apiVerifySupabase({ supabaseToken });
        const { token, user, requires2fa } = response.data;

        if (token) {
          await serializeAuthStorage(async () => {
            await saveCredentials(token, user);
            set({ accessToken: token, user, isAuthenticated: true, isSessionLocked: false, loading: false });
          });
          return { requires2fa: false, user };
        } else if (requires2fa) {
          set({ loading: false });
          return { requires2fa: true, user };
        } else {
          set({ loading: false });
          return { requires2fa: false, user: null };
        }
      } catch (err: any) {
        set({ error: err.message || "Google login failed", loading: false });
        throw err;
      } finally {
        activeGoogleLoginPromise = null;
      }
    })();

    return activeGoogleLoginPromise as any;
  },

  logout: async () => {
    // Remove protected UI immediately, even if native storage cleanup is slow.
    set({ user: null, accessToken: null, isAuthenticated: false, isSessionLocked: false, loading: false, error: null });
    useUIStore.getState().reset();
    useToastStore.getState().hide();
    return serializeAuthStorage(async () => {
      for (const key of [SECURE_STORE_KEYS.ACCESS_TOKEN, SECURE_STORE_KEYS.BIOMETRIC_KEY, SECURE_STORE_KEYS.USER_PROFILE]) {
        try {
          await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
        } catch (err) {
          console.error("Failed to delete auth credential on logout", err);
        }
      }
    });
  },

  forgotPassword: async (email: string) => {
    set({ loading: true, error: null });
    try {
      await apiForgotPassword(email);
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to request password reset", loading: false });
      throw err;
    }
  },

  resetPassword: async (email: string, otp: string, newPassword: string) => {
    set({ loading: true, error: null });
    try {
      await apiResetPassword({ email, otp, newPassword });
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to reset password", loading: false });
      throw err;
    }
  },

  refreshProfile: async () => {
    try {
      const response = await fetchProfile();
      set({ user: response.data });
      await SecureStore.setItemAsync(
        SECURE_STORE_KEYS.USER_PROFILE,
        JSON.stringify(response.data),
        SECURE_STORE_OPTIONS
      );
    } catch (err: any) {
      console.error("Failed to refresh profile in auth store", err);
      throw err;
    }
  },

  clearError: () => set({ error: null }),

  completeSessionUnlock: (token, user, lockedToken) => serializeAuthStorage(async () => {
    const isCurrentSession = () => {
      const current = useAuthStore.getState();
      return current.isAuthenticated && current.isSessionLocked &&
        current.user?.id === user.id && current.accessToken === lockedToken;
    };
    // Late responses must not restore a disconnected or different account.
    if (!isCurrentSession()) return false;
    await saveCredentials(token, user);
    if (!isCurrentSession()) return false;
    set({ accessToken: token, user, isAuthenticated: true, isSessionLocked: false, loading: false });
    return true;
  }),

  biometricUnlock: async (): Promise<boolean> => {
    const lockedToken = useAuthStore.getState().accessToken;
    set({ loading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error("No user profile loaded");
      }
      const biometricKey = await SecureStore.getItemAsync(
        SECURE_STORE_KEYS.BIOMETRIC_KEY,
        SECURE_STORE_OPTIONS
      );
      if (!biometricKey) {
        throw new Error("No stored biometric key found on this device");
      }

      const response = await apiBiometricLogin({
        userId: user.id,
        biometricKey,
      });

      const { token, user: updatedUser } = response.data;
      if (token) {
        return await useAuthStore.getState().completeSessionUnlock(token, updatedUser, lockedToken);
      } else {
        set({ loading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message || "Biometric unlock failed", loading: false });
      throw err;
    }
  },
}));

// Same-account unlock preserves drafts; changing the account discards them.
useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) useUIStore.getState().reset();
});

// Register API client callbacks to handle token refresh and auto session lock
setTokenRefreshedCallback((token) => {
  useAuthStore.setState({ accessToken: token });
});

setUnauthorizedCallback(() => {
  if (useAuthStore.getState().isAuthenticated) {
    useAuthStore.setState({ isSessionLocked: true });
  }
});

