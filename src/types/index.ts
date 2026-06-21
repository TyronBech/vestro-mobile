export interface UserResponse {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  currency?: string | null;
  spendingLimit?: number | null;
  biometricsEnabled: boolean;
  panicModeEnabled: boolean;
  is2FAEnabled: boolean;
  lastActiveAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileResponse {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  currency?: string | null;
  spendingLimit?: number | null;
  biometricsEnabled: boolean;
  panicModeEnabled: boolean;
  is2FAEnabled: boolean;
  lastActiveAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSuccessPayload {
  user: UserResponse;
  token: string;
  requires2fa?: boolean;
}

export interface ApiResponse<T> {
  data: T;
}

export interface LoginParams {
  email: string;
  password?: string;
}

export interface SignupParams {
  email: string;
  password?: string;
  name: string;
}

export interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  
  initialize: () => Promise<void>;
  login: (params: LoginParams) => Promise<void>;
  signup: (params: SignupParams) => Promise<void>;
  loginWithGoogle: (supabaseToken: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}
