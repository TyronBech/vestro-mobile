import { API_BASE_URL, API_RETRIES, API_TIMEOUT_MS } from "./config";

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

type ApiErrorKind = "http" | "timeout" | "network" | "unknown";

export class ApiClientError extends Error {
  kind: ApiErrorKind;
  status?: number;

  constructor(message: string, kind: ApiErrorKind, status?: number) {
    super(message);
    this.name = "ApiClientError";
    this.kind = kind;
    this.status = status;
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getErrorMessage = (data: unknown, fallback: string): string => {
  if (typeof data === "object" && data !== null && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};

const parseResponse = async (response: Response): Promise<unknown> => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const shouldRetry = (
  error: ApiClientError,
  attempt: number,
  retries: number,
): boolean => {
  if (attempt >= retries) {
    return false;
  }

  if (error.kind === "timeout" || error.kind === "network") {
    return true;
  }

  return (
    error.kind === "http" &&
    typeof error.status === "number" &&
    error.status >= 500
  );
};

const normalizeError = (error: unknown): ApiClientError => {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new ApiClientError("Request timed out.", "timeout");
  }

  if (error instanceof TypeError) {
    return new ApiClientError(
      "Network error. Check that the backend is reachable.",
      "network",
    );
  }

  return new ApiClientError("Unexpected API error.", "unknown");
};

export const isApiClientError = (error: unknown): error is ApiClientError =>
  error instanceof ApiClientError;

export const apiClient = async <T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS;
  const retries = options.retries ?? API_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? 500;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const {
    timeoutMs: _timeoutMs,
    retries: _retries,
    retryDelayMs: _retryDelayMs,
    ...restOptions
  } = options;

  const config: RequestInit = {
    ...restOptions,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new ApiClientError(
          getErrorMessage(data, "An error occurred during the request."),
          "http",
          response.status,
        );
      }

      return data as T;
    } catch (error) {
      const normalizedError = normalizeError(error);

      if (shouldRetry(normalizedError, attempt, retries)) {
        await wait(retryDelayMs * (attempt + 1));
        continue;
      }

      console.error(`API Error on ${endpoint}:`, normalizedError);
      throw normalizedError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new ApiClientError("Request failed after retries.", "unknown");
};
