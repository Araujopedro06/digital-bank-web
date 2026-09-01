export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  name: string;
}

export interface Account {
  id: string;
  number: string;
  balance: number;
  ownerName: string;
  createdAt: string;
}

export type TransactionType = 'TRANSFER_IN' | 'TRANSFER_OUT' | 'DEPOSIT';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  counterpartyNumber: string | null;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ApiError {
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
}
