import { NativeModules, Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const APP_SLUG = Constants.expoConfig?.slug || "vestro";

export const SECURE_STORE_KEYS = {
  ACCESS_TOKEN: `${APP_SLUG}_access_token`,
  BIOMETRIC_KEY: `${APP_SLUG}_biometric_key`,
  USER_PROFILE: `${APP_SLUG}_user_profile`,
  RATE_LIMIT_EXPIRES_AT: `${APP_SLUG}_rate_limit_expires_at`,
} as const;


export const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
  keychainService: `${APP_SLUG}_auth_keychain`,
};

const DEFAULT_API_URL = "http://localhost:3000/api";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 1;

const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env ?? {};
const timeoutFromEnv = Number(env.EXPO_PUBLIC_API_TIMEOUT_MS);
const retriesFromEnv = Number(env.EXPO_PUBLIC_API_RETRIES);

const getDebuggerHost = (): string | null => {
  const debuggerHost = Constants.expoGoConfig?.debuggerHost;
  if (debuggerHost) {
    return debuggerHost.split(":")[0] || null;
  }
  return null;
};

const parseScriptHost = (): string | null => {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (typeof scriptURL !== "string" || !scriptURL) {
    return null;
  }

  try {
    return new URL(scriptURL).hostname;
  } catch {
    return null;
  }
};

const looksLikeLocalhost = (value: string): boolean =>
  value.includes("://localhost") || value.includes("://127.0.0.1");

const buildApiUrlFromHost = (host: string): string => `http://${host}:3000/api`;

const resolveApiUrl = (): string => {
  const envUrl = env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
  if (!looksLikeLocalhost(envUrl)) {
    return envUrl;
  }

  const debuggerHost = getDebuggerHost();
  if (debuggerHost) {
    return buildApiUrlFromHost(debuggerHost);
  }

  const expoHost = parseScriptHost();
  if (expoHost && expoHost !== "localhost" && expoHost !== "127.0.0.1") {
    return buildApiUrlFromHost(expoHost);
  }

  if (Platform.OS === "android") {
    return envUrl
      .replace("://localhost", "://10.0.2.2")
      .replace("://127.0.0.1", "://10.0.2.2");
  }

  return envUrl;
};

export const API_BASE_URL = resolveApiUrl();
export const API_TIMEOUT_MS =
  Number.isFinite(timeoutFromEnv) && timeoutFromEnv > 0
    ? timeoutFromEnv
    : DEFAULT_TIMEOUT_MS;
export const API_RETRIES =
  Number.isFinite(retriesFromEnv) && retriesFromEnv >= 0
    ? retriesFromEnv
    : DEFAULT_RETRIES;

export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || "vestro";
export const SUPABASE_STORAGE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || "vestro-bucket";
