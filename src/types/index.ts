export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  avatarUrl?: string | null;
  currency: string;
  spendingLimit: number;
  biometricsEnabled: boolean;
  panicModeEnabled: boolean;
  twoFactorEnabled: boolean;
  lastActiveAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileResponse {
  id: string;
  email: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  avatarUrl?: string | null;
  currency: string;
  spendingLimit: number;
  biometricsEnabled: boolean;
  panicModeEnabled: boolean;
  twoFactorEnabled: boolean;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
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
  firstName: string;
  lastName: string;
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
  clearError: () => void;
}
