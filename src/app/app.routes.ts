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
    path: 'pix',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/pix/pix').then((m) => m.Pix),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'pay' },
      {
        path: 'pay',
        loadComponent: () => import('./pages/pix/pay/pix-pay').then((m) => m.PixPay),
      },
      {
        // Where a scanned QR code lands: the same screen, already knowing who is
        // being paid.
        path: 'pay/:chargeId',
        loadComponent: () => import('./pages/pix/pay/pix-pay').then((m) => m.PixPay),
      },
      {
        path: 'receive',
        loadComponent: () =>
          import('./pages/pix/receive/pix-receive').then((m) => m.PixReceive),
      },
      {
        path: 'keys',
        loadComponent: () => import('./pages/pix/keys/pix-keys').then((m) => m.PixKeys),
      },
    ],
  },
  {
    path: 'money',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/money/money').then((m) => m.Money),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tia' },
      {
        path: 'tia',
        loadComponent: () => import('./pages/money/aunt/aunt').then((m) => m.Aunt),
      },
      {
        path: 'emprestimo',
        loadComponent: () => import('./pages/money/loan/loan').then((m) => m.LoanPage),
      },
    ],
  },
  {
    path: 'statement',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/statement/statement').then((m) => m.Statement),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
  },
  { path: '**', redirectTo: 'dashboard' },
];
