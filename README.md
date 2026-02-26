# Leadgenerator Frontend

## Local development

1. Copy `.env.example` to `.env`.
2. Set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Keep:
   - `VITE_API_BASE_URL=` (empty)
   - `VITE_API_PROXY_TARGET=http://127.0.0.1:4000`
4. Run `npm i`.
5. Run `npm run dev`.

With `VITE_API_BASE_URL` empty, frontend calls `/api` and Vite proxies to backend.

## Production build env

Use `.env.production.example` as template and set:
- `VITE_API_BASE_URL=https://api.yourdomain.com` (if backend is separate domain)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## URL values you will exchange for production

- `VITE_API_BASE_URL`
  - from: empty (dev proxy)
  - to: `https://api.yourdomain.com` (or keep empty only if same-domain reverse proxy is configured)

## Build

Run `npm run build` to verify production bundle compiles with your env setup.
