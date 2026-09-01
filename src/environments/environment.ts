export const environment = {
  production: false,
  /**
   * Relative on purpose. The dev server proxies /api to the backend
   * (proxy.conf.json), which keeps the app on a single origin — no CORS, and no
   * mixed-content block when the page is served over HTTPS to test on a phone.
   */
  apiUrl: '/api',
};
