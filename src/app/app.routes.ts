import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'transfer',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/transfer/transfer').then((m) => m.Transfer),
  },
  {
    path: 'statement',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/statement/statement').then((m) => m.Statement),
  },
  { path: '**', redirectTo: 'dashboard' },
];
