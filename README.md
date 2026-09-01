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
├── core       auth, HTTP interceptor, guards, API clients, face + profile services
├── pages      login, register, dashboard, transfer, statement, profile (lazy-loaded)
├── shared     face-capture: webcam, liveness challenge, descriptor extraction
├── app.ts     shell: navigation, avatar, responsive chrome
└── app.routes route table with auth/guest guards
```

## Profile photo and facial verification

The profile page takes a JPEG/PNG avatar (2 MB cap, checked here and again by
magic bytes on the server) and manages the face enrolment.

Face capture runs entirely in the browser with
[@vladmandic/face-api](https://github.com/vladmandic/face-api). The camera frame
is never uploaded: the page detects the face, asks for a random liveness
challenge (blink, turn left, turn right) computed from the 68 landmarks, then
extracts a 128-number descriptor and sends only that. The server does the
matching.

Once enrolled, the face is required to finish a login and to confirm each
transfer, in both cases via a single-use token from the API.

The library and its ~6.7 MB of weights are lazy-loaded on first use, so the
initial bundle stays around 90 kB transferred; face-api lands in its own 268 kB
chunk fetched only when a face screen opens.

**This is demo-grade liveness.** The challenge raises the bar past a still
photo, but it is not anti-spoofing — the UI says so, and the README of the API
covers both the LGPD handling and why a browser-computed descriptor cannot be a
true second factor.

### Threshold calibration

`tools/face-threshold-eval/index.html` measures, on real faces, how far apart
descriptors of different people are versus the same face recaptured, and prints
the false accept/reject count per threshold. It is what set the API's 0.45.

Serve the repo root over HTTP and open the page — `file://` will not work,
because it loads ES modules and the model weights:

```bash
npx http-server . -p 8099 -o /tools/face-threshold-eval/
```

It reads the sample photos straight out of `node_modules`, so `npm install` is
the only setup.

## Running it

Requires Node 20+ and the API running on `http://localhost:8080`.

```bash
npm install
npm start
```

Then open <http://localhost:4200> and sign in with `pedro@demo.com` / `demo1234`
(seeded by the API's dev profile). The dev server proxies `/api` to the backend,
so there is no CORS setup to do.

## Testing on a phone over the local network

The camera is the reason this needs care: browsers only expose `getUserMedia` in
a **secure context**, and `http://192.168.x.x` is not one. Over plain HTTP the
face screens will always fail on a phone, however well the rest works.

```bash
npm run start:lan
```

That serves over HTTPS on every interface (`ng serve --host 0.0.0.0 --ssl`) with
a self-signed certificate. On the phone, open `https://<your-machine-ip>:4200`
and accept the certificate warning once — after that it is a secure context and
the camera works.

The dev server also proxies `/api` to the backend on port 8080
(`proxy.conf.json`), so the whole app is one origin. That matters twice over: no
CORS, and no mixed-content block, which is what would happen if an HTTPS page
called an HTTP API.

If the phone cannot reach the machine at all, it is almost always the host
firewall — the dev server needs an inbound allow rule for `node.exe` on the
profile your Wi-Fi is using (Private or Public).

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
