import { environment } from '../../environments/environment';

/**
 * Where the API lives, resolved when the page loads rather than when it is built.
 *
 * <p>The front end and the API are deployed separately, so the API's address is
 * a property of the environment, not of the bundle. Baking it in at build time
 * would mean a rebuild to repoint it, and a different artifact per environment.
 * A one-line config.json sitting next to index.html can be edited or replaced by
 * the host instead.
 */
export const runtimeConfig = {
  apiUrl: environment.apiUrl,
};

/** Resolved against the document base, so it survives being served under a sub-path. */
export async function loadRuntimeConfig(): Promise<void> {
  try {
    const response = await fetch(new URL('config.json', document.baseURI), { cache: 'no-store' });
    if (!response.ok) {
      return;
    }
    const loaded = (await response.json()) as { apiUrl?: unknown };
    if (typeof loaded.apiUrl === 'string' && loaded.apiUrl.trim()) {
      runtimeConfig.apiUrl = loaded.apiUrl.trim().replace(/\/$/, '');
    }
  } catch {
    // No config.json, or it is unreadable: the built-in default is the answer.
  }
}
