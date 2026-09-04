import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { safeRedirect } from './redirect';

/**
 * Sends a signed-out visitor to login, remembering where they were going. A Pix
 * link opened from a QR code lands on a payment screen, and losing it to the
 * dashboard would mean asking them to find the payment again by hand.
 */
export const authGuard: CanActivateFn = (_route, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isLoggedIn()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};

/** Keeps a signed-in user out of the login and register screens. */
export const guestGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isLoggedIn()
    ? router.parseUrl(safeRedirect(route.queryParamMap.get('redirect')))
    : true;
};
