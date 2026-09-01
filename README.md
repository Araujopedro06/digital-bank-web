# Digital Bank — Web

Angular 20 client for the Digital Bank API: sign-in, balance, transfers and
statement. One responsive codebase — a sidebar-style top bar on desktop that
becomes a bottom tab bar on phones, the way a real banking app behaves.

The Spring Boot API it talks to lives in
[digital-bank-api](https://github.com/Araujopedro06/digital-bank-api).

## Stack

| Concern       | Choice                                    |
| ------------- | ----------------------------------------- |
| Framework     | Angular 20, standalone components         |
| State         | Signals                                   |
| Forms         | Reactive forms                            |
| Styling       | SCSS with CSS custom properties           |
| Auth          | JWT in `localStorage`, functional interceptor |
| Locale        | pt-BR (`R$ 1.234,56`, `dd/MM/yyyy`)       |

## Layout

```
src/app
├── core       auth service, HTTP interceptor, route guards, API client, models
├── pages      login, register, dashboard, transfer, statement (lazy-loaded)
├── app.ts     shell: navigation, responsive chrome
└── app.routes route table with auth/guest guards
```

## Running it

Requires Node 20+ and the API running on `http://localhost:8080`.

```bash
npm install
npm start
```

Then open <http://localhost:4200> and sign in with `pedro@demo.com` / `demo1234`
(seeded by the API's dev profile).

## Build

```bash
npm run build
```

`ng build` swaps `environment.ts` for `environment.production.ts`, which points
the client at a same-origin `/api` instead of `localhost:8080`.

## Notes on the design

- **Every page but login/register is behind `authGuard`;** signed-in users are
  bounced away from login/register by `guestGuard`.
- **The interceptor attaches the JWT and signs the user out on a 401,** so an
  expired token never leaves the UI in a half-broken state.
- **Error copy is decided client-side** from the HTTP status. The API keeps its
  messages generic and in English on purpose; `core/api-error.ts` maps them to
  Portuguese.
- **Feature routes are lazy-loaded,** keeping the initial bundle around 88 kB
  transferred.
