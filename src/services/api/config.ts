import { NativeModules, Platform } from "react-native";

const DEFAULT_API_URL = "http://localhost:3000/api";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 1;

const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env ?? {};
const timeoutFromEnv = Number(env.EXPO_PUBLIC_API_TIMEOUT_MS);
const retriesFromEnv = Number(env.EXPO_PUBLIC_API_RETRIES);

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
