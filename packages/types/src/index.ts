// Shared types for PiggyBet
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'player' | 'admin' | 'agent';
  status: 'active' | 'suspended' | 'banned';
  createdAt: string;
  updatedAt: string;
}

export interface Player extends User {
  role: 'player';
  balance: number;
  vipLevel: number;
  totalDeposits: number;
  totalWithdrawals: number;
  referralCode: string;
}

export interface AdminStaff {
  id: string;
  username: string;
  email: string;
  name: string;
  role: {
    id: string;
    name: string;
    slug: string;
  };
  permissions: string[];
  isTwoFactorEnabled: boolean;
  lastLogin: string | null;
  status: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  session?: string;
}