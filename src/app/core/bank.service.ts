import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { runtimeConfig } from './runtime-config';
import { Account, Page, Transaction } from './models';

@Injectable({ providedIn: 'root' })
export class BankService {
  private readonly http = inject(HttpClient);
  private readonly base = runtimeConfig.apiUrl;

  myAccount() {
    return this.http.get<Account>(`${this.base}/accounts/me`);
  }

  statement(page = 0, size = 20) {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<Transaction>>(`${this.base}/transactions`, { params });
  }

  transfer(
    toAccountNumber: string,
    amount: number,
    description: string,
    faceToken: string | null = null,
  ) {
    return this.http.post<Transaction>(`${this.base}/transfers`, {
      toAccountNumber,
      amount,
      description,
      faceToken,
    });
  }

  deposit(amount: number, description: string) {
    return this.http.post<Transaction>(`${this.base}/deposits`, { amount, description });
  }
}
