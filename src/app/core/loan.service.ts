import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { runtimeConfig } from './runtime-config';
import { Loan, LoanPayment, LoanQuote, LoanTerms } from './models';

@Injectable({ providedIn: 'root' })
export class LoanService {
  private readonly http = inject(HttpClient);
  private readonly base = `${runtimeConfig.apiUrl}/loans`;

  terms() {
    return this.http.get<LoanTerms>(`${this.base}/terms`);
  }

  simulate(amount: number, installments: number) {
    const params = new HttpParams().set('amount', amount).set('installments', installments);
    return this.http.get<LoanQuote>(`${this.base}/simulation`, { params });
  }

  /** Answers 204 with a null body when no loan is running. */
  active() {
    return this.http.get<Loan | null>(`${this.base}/active`);
  }

  take(amount: number, installments: number) {
    return this.http.post<Loan>(this.base, { amount, installments });
  }

  payInstallment() {
    return this.http.post<LoanPayment>(`${this.base}/active/payments`, {});
  }

  settle() {
    return this.http.post<LoanPayment>(`${this.base}/active/settlement`, {});
  }
}
