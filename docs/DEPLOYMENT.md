# Deployment

OurLegacy is a static site: `npm run build` produces `dist/`. No backend, no environment variables.

## Netlify
`netlify.toml` sets `npm run build`, publishes `dist`, and rewrites every path to `/index.html` so client-side routes (`/app/tree/:id`, `/sample`) survive a refresh.

## Vercel
`vercel.json` contains the same SPA rewrite. Framework preset: Vite. Build `npm run build`, output `dist`.

## Other static hosts
Serve `dist/` with a fallback to `index.html` for unknown paths.

## Checklist
- [ ] `npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build`
- [ ] Verify the name "OurLegacy", domain and trademark.
- [ ] Serve over HTTPS (needed for IndexedDB persistence prompts and clipboard-free downloads in some browsers).
- [ ] Optionally add a Content-Security-Policy such as `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'`; the app makes no third-party requests.
