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

export type TransactionType =
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'DEPOSIT'
  | 'PIX_IN'
  | 'PIX_OUT'
  | 'ALLOWANCE'
  | 'LOAN_CREDIT'
  | 'LOAN_PAYMENT';

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

export interface FaceStatus {
  enrolled: boolean;
  consentedAt: string | null;
}

export interface StepUpToken {
  verificationToken: string;
  expiresIn: number;
}

/** A login that stopped at the password step because a face is enrolled. */
export interface LoginResponse extends AuthResponse {
  requiresFaceVerification: boolean;
  challengeToken: string | null;
}

export type PixKeyType = 'CPF' | 'EMAIL' | 'PHONE' | 'RANDOM';

export interface PixKey {
  id: string;
  type: PixKeyType;
  /** The canonical key — what gets pasted or encoded. */
  value: string;
  /** The same key, punctuated for reading. */
  display: string;
  createdAt: string;
}

/** Who a key belongs to, shown before any money moves. */
export interface PixRecipient {
  key: string;
  type: PixKeyType;
  display: string;
  ownerName: string;
  accountNumber: string;
  own: boolean;
}

export interface BrCode {
  /** The "copia e cola" string, which is also exactly what the QR encodes. */
  payload: string;
  key: PixKey;
  amount: number | null;
  description: string | null;
}

export interface BrCodeParsed {
  recipient: PixRecipient;
  amount: number | null;
  description: string | null;
}

/** A shareable request to be paid — what a QR code or a sent link points at. */
export interface PixCharge {
  /** The only part that goes into the link; the key stays on the server. */
  id: string;
  key: PixKey;
  amount: number | null;
  description: string | null;
  expiresAt: string;
  /** The same request as a standard copia e cola payload. */
  brCode: string;
}

export interface PixChargeLookup {
  recipient: PixRecipient;
  amount: number | null;
  description: string | null;
  expiresAt: string;
}

/** What the aunt decided. The words she says are chosen on this side. */
export type AllowanceOutcome = 'GRANTED' | 'HAGGLED' | 'REFUSED';

export interface AllowanceResult {
  outcome: AllowanceOutcome;
  asked: number;
  granted: number;
  balance: number;
  availableAt: string | null;
}

export interface AllowanceStatus {
  /** When she will pick up the phone again, or null if she will now. */
  availableAt: string | null;
  generousLimit: number;
  haggleLimit: number;
}

export type LoanStatus = 'ACTIVE' | 'SETTLED';

export interface Loan {
  id: string;
  principal: number;
  monthlyRate: number;
  installments: number;
  installmentAmount: number;
  paidInstallments: number;
  /** The principal still owed — also what settling early costs. */
  outstanding: number;
  /** What the remaining instalments add up to, for comparison. */
  remainingToTerm: number;
  status: LoanStatus;
  createdAt: string;
  settledAt: string | null;
}

export interface LoanQuote {
  principal: number;
  installments: number;
  monthlyRate: number;
  installmentAmount: number;
  total: number;
  totalInterest: number;
}

export interface LoanTerms {
  maxPrincipal: number;
  monthlyRate: number;
  allowedInstallments: number[];
}

export interface LoanPayment {
  total: number;
  interest: number;
  amortized: number;
  settled: boolean;
  loan: Loan;
}
