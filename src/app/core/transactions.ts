import { Transaction, TransactionType } from './models';

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  DEPOSIT: 'Depósito',
  TRANSFER_IN: 'Transferência recebida',
  TRANSFER_OUT: 'Transferência enviada',
  PIX_IN: 'Pix recebido',
  PIX_OUT: 'Pix enviado',
  ALLOWANCE: 'Presente recebido',
  LOAN_CREDIT: 'Empréstimo',
  LOAN_PAYMENT: 'Empréstimo',
};

/** The kinds that take money out. Everything else puts it in. */
const DEBITS: TransactionType[] = ['TRANSFER_OUT', 'PIX_OUT', 'LOAN_PAYMENT'];

/**
 * Lives here rather than in each page: the dashboard and the statement both draw
 * a sign and a colour from it, and a new kind of transaction that only half of
 * them knew about would show up green on one screen and red on the other.
 */
export function isCredit(transaction: Transaction): boolean {
  return !DEBITS.includes(transaction.type);
}
