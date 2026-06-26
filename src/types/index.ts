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
  refreshProfile: () => Promise<void>;
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

export interface MacroAsset {
  id: string;
  userId: string;
  bankName: string;
  purpose: string;
  balance: number; // in cents
  colorCode: string;
  iconUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMacroAssetParams {
  bankName: string;
  purpose: string;
  balance?: number;
  targetGoal?: number | null;
  iconUrl?: string | null;
  colorCode?: string | null;
}

export type CoreNetworkType =
  | 'EMERGENCY_FUND'
  | 'RENT'
  | 'WANTS_SANDBOX'
  | 'INVESTMENTS'
  | 'INSURANCE'
  | 'CREDIT_BUFFER'
  | 'PERSONAL_GOAL'
  | 'SAVINGS_VAULT'
  | 'CREDIT_CARD'
  | 'UTILITIES'
  | 'PAYCHECK';

export interface CoreNetwork {
  id: string;
  userId: string;
  macroAssetId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  percentage: number;
  balance: number; // in cents
  type: CoreNetworkType | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCoreNetworkParams {
  macroAssetId: string;
  parentId?: string | null;
  name: string;
  description?: string;
  percentage: number;
  type?: CoreNetworkType | null;
}

export interface UpdateCoreNetworkParams {
  name?: string;
  description?: string;
  percentage?: number;
  type?: CoreNetworkType | null;
}

export interface CashFlow {
  id: string;
  userId: string;
  coreNetworkId: string;
  amount: number; // raw positive amount in cents
  type: 'INFLOW' | 'OUTFLOW';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  coreNetwork?: {
    id: string;
    name: string;
    balance: number;
  };
}
