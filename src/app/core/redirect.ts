const DEFAULT = '/dashboard';

/**
 * Where to send someone after they sign in.
 *
 * <p>The value arrives in a query parameter, which means anyone can put anything
 * in it — including `https://not-this-bank.example`. Sending a freshly signed-in
 * user wherever a link tells us to is an open redirect, and a bank is exactly the
 * kind of site people are phished into. Only a path on this origin is honoured;
 * a protocol-relative `//evil.example`, which the browser reads as another host,
 * is not a path.
 */
export function safeRedirect(target: string | null | undefined): string {
  if (!target || !target.startsWith('/') || target.startsWith('//')) {
    return DEFAULT;
  }
  return target;
}
