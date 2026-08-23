# Eventa demo runbook

## Local setup

```powershell
npm install
Copy-Item .env.example .env.local
```

Set a server-side KI:connect credential in `.env.local`:

```dotenv
KICONNECT_API_KEY=your_kiconnect_api_key
KICONNECT_BASE_URL=https://chat.kiconnect.nrw/api/v1
KICONNECT_MODEL=mistralai-mistral-small-4-119b
KICONNECT_FALLBACK_MODEL=gpt-oss-120b
```

Never put the key in a `VITE_*` variable, browser tool, screenshot, commit, or demo terminal output.

Start the API and bundled frontend:

```powershell
npm run dev
```

Local defaults are `http://localhost:5173` and `http://127.0.0.1:8787`.

## Health checks

Local:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/api/health
```

Production:

```powershell
Invoke-RestMethod https://eventa-production-3df2.up.railway.app/api/health
```

Confirm `status` is `ok`, `aiConfigured` is `true`, and `aiProvider` is `kiconnect`. Health does not call KI:connect or consume quota.

## Production boundaries

Vercel frontend:

```dotenv
VITE_API_BASE_URL=https://eventa-production-3df2.up.railway.app
```

Railway backend:

```dotenv
KICONNECT_API_KEY=your_kiconnect_api_key
KICONNECT_BASE_URL=https://chat.kiconnect.nrw/api/v1
KICONNECT_MODEL=mistralai-mistral-small-4-119b
KICONNECT_FALLBACK_MODEL=gpt-oss-120b
FRONTEND_ORIGIN=https://eventa-five.vercel.app
```

Railway supplies `PORT`. The backend binds to `0.0.0.0`. Confirm the exact Vercel origin is configured; production CORS must not use `*`.

## Quota-free rehearsal

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:quantities
npm run verify:products
npx tsx scripts/validate-products.ts
```

The quantity, product, and dataset commands use local fixtures/data. They do not call KI:connect.

## Normal demo flow

1. Open [eventa-five.vercel.app](https://eventa-five.vercel.app).
2. Enter a clear event request containing attendance, format, budget if relevant, and explicit dietary counts where known.
3. Show the structured interpretation. Explain that unstated facts remain “Not specified”.
4. Correct one detail if useful; changed facts invalidate stale planning output.
5. Confirm the event and show the generated menu.
6. Continue through deterministic quantities and highlight any `needs_confirmation` allocation.
7. Show selected or unresolved Transgourmet matches and their reasons/alternatives.
8. Show packs, purchased quantity, surplus, known subtotal, unpriced lines, and grouped shopping list.
9. Explain that a partial budget is honest when public price evidence is missing.

Never present design-reference totals, deterministic fixtures, or missing catalogue values as live results.

## Backend pipeline evidence

The detailed request contracts are in [API.md](API.md):

```text
/api/interpret-event
→ /api/generate-menu
→ /api/calculate-quantities
→ /api/match-products
→ /api/create-purchasing-plan
```

Pass real output from one endpoint into the next. Partial/unresolved results are valid behavior and must not be replaced with mock products or prices.

Live scripts—`verify:ai`, `verify:menus`, `verify:flow-reliability`, `verify:kiconnect-*`, `verify:purchasing`, and the benchmark commands—call KI:connect. Run them only when a deliberate live-provider check is needed.

## Before judges arrive

- Check the exact deployed commit and both public URLs.
- Confirm Railway health reports configured KI:connect.
- Confirm Vercel's API base URL and Railway's exact frontend origin.
- Complete one non-sensitive mobile rehearsal.
- Run the quota-free tests and deterministic verifiers.
- Confirm the canonical CSV is packaged/readable by the Railway working directory.
- Keep keys out of browser, terminal, screenshots, and Git.
- Keep the limitation statement ready: catalogue and price coverage are snapshots and partial, not a live ordering feed.

## Provider risk and recovery

KI:connect is external and can experience latency, quota/rate limits, 429/503 responses, timeouts, or invalid structured output. Eventa already provides bounded transport retries, `Retry-After` support, separate corrective regeneration, Mistral-to-GPT-OSS fallback for eligible failures, request deduplication, a short-lived successful cache, safe errors, and user retry paths.

If supported recovery is exhausted, do not repeatedly submit requests or claim provider health. Preserve the event input, wait, check Railway request IDs/log categories, and retry once. Do not create fake offline AI results; deterministic fixtures are suitable only when clearly labelled as fixtures.
