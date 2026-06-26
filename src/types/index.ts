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

export interface NetWorthDataPoint {
  month: string;
  balance: number; // in cents
}

export interface CashFlowDataPoint {
  month: string;
  inflow: number; // in cents
  outflow: number; // in cents
}

export interface CoreNetworkBalance {
  id: string;
  name: string;
  type: string;
  balance: number; // in cents
  colorCode: string;
  bankName: string;
}

export interface BudgetConfig {
  netSalary: number;
  needsRate: number;
  wantsRate: number;
  savingsRate: number;
  investmentsRate: number;
}

export interface AnalyticsData {
  totalSavings: number;
  totalInvestments: number;
  netWorthTrend: NetWorthDataPoint[];
  cashFlowTrend: CashFlowDataPoint[];
  coreNetworkBalances: CoreNetworkBalance[];
  budgetConfig: BudgetConfig | null;
}
