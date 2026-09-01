import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse } from './models';

const TOKEN_KEY = 'digital-bank.token';
const NAME_KEY = 'digital-bank.name';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly userName = signal<string | null>(localStorage.getItem(NAME_KEY));
  readonly isLoggedIn = computed(() => this.token() !== null);

  currentToken(): string | null {
    return this.token();
  }

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((response) => this.store(response)));
  }

  register(name: string, email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, { name, email, password })
      .pipe(tap((response) => this.store(response)));
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NAME_KEY);
    this.token.set(null);
    this.userName.set(null);
    this.router.navigate(['/login']);
  }

  private store(response: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(NAME_KEY, response.name);
    this.token.set(response.token);
    this.userName.set(response.name);
  }
}
