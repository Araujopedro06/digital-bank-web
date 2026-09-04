import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { runtimeConfig } from './runtime-config';
import { AllowanceResult, AllowanceStatus } from './models';

@Injectable({ providedIn: 'root' })
export class AllowanceService {
  private readonly http = inject(HttpClient);
  private readonly base = `${runtimeConfig.apiUrl}/allowance`;

  status() {
    return this.http.get<AllowanceStatus>(this.base);
  }

  ask(amount: number) {
    return this.http.post<AllowanceResult>(this.base, { amount });
  }
}
