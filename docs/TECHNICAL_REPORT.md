# Eventa technical report

## 1. Executive summary

Eventa is a mobile-first **Event in a Box** prototype for BÄRNHÄCKT 2026 and the Transgourmet challenge. It translates a natural-language catering brief into validated event facts, a professional menu, deterministic ingredient quantities, canonical Transgourmet product recommendations, pack calculations, a partial or complete budget, and a grouped shopping list.

The defining boundary is:

> **AI reasons. Eventa calculates. Transgourmet data provides product facts.**

KI:connect provides language and menu reasoning. Every authoritative calculation and product fact remains validated and deterministic.

## 2. Product objective

An organiser's brief must normally be translated across dietary notes, menu decisions, serving counts, ingredient quantities, catalogue products, packs, prices, budgets, and a shopping list. Eventa connects these steps while keeping missing evidence and ambiguous decisions visible.

The backend implements the complete computational pipeline through purchasing. The deployed Vercel experience is maintained on `feat/frontend-pages`; this backend branch deliberately remains unmerged with that frontend work.

## 3. User journey

1. A QR visitor describes an event without authentication.
2. KI:connect extracts only supported facts into `EventInterpretation`.
3. The visitor reviews and edits those facts.
4. Mistral Small 4 proposes a structured catering menu with per-serving recommendations.
5. Eventa validates and normalizes the menu.
6. Deterministic code allocates servings and calculates ingredient requirements.
7. The matcher ranks the canonical Transgourmet snapshot and selects only safe products.
8. The purchasing engine calculates compatible packs, purchased quantity, surplus, known line totals, a partial or complete budget, and grouped shopping lines.
9. Ambiguous, unresolved, unpriced, and already-in-stock lines remain explicit.

## 4. System architecture

The React frontend calls a lightweight Railway-hosted Node HTTP API. Shared TypeScript contracts define events, menus, quantities, product matches, and purchasing plans. Zod guards all HTTP and provider trust boundaries.

At startup, the server constructs the KI:connect primary/fallback provider and wraps it in request deduplication and a bounded successful-result cache. Six routes expose the planning stages. Quantity, product, and purchasing code has no AI or network dependency. The matcher lazily loads the canonical CSV.

Production topology:

```text
Audience / QR
→ Vercel frontend
→ Railway Eventa API
→ KI:connect
→ deterministic Eventa engines
→ canonical Transgourmet snapshot
```

## 5. AI architecture

### Provider and models

Eventa uses one production provider family: KI:connect through its OpenAI-compatible Chat Completions endpoint.

- primary: `mistralai-mistral-small-4-119b`
- fallback: `gpt-oss-120b`

Mistral Small 4 benchmarked substantially faster for Eventa's structured interpretation and menu workload while producing schema-valid results without observed menu-policy violations. GPT OSS remains the fallback after eligible transient Mistral transport exhaustion or schema/policy failure after corrective regeneration. Permanent authentication and permanent request errors fail safely instead of being masked.

AI is restricted to:

- extracting event facts from natural language;
- proposing an event-appropriate catering menu;
- recommending per-serving portions and ingredient amounts.

The prompt prohibits event totals, pack counts, product brands, prices, shopping-list calculations, and derived dietary audience allocations.

### Reliability controls

- OpenAI-compatible JSON Schema structured output.
- Strict Zod parsing, normalization, stable IDs, and menu-policy checks.
- Up to three bounded transport attempts for eligible transient failures.
- `Retry-After` support and bounded fallback delays.
- One corrective regeneration separated from transport recovery.
- GPT OSS fallback only after supported Mistral failure conditions.
- SHA-256 normalized request keys and identical-request in-flight deduplication.
- Five-minute, 100-entry process-local successful-result cache.

These controls improve resilience but do not guarantee external provider availability or quota.

## 6. Event interpretation

`EventInterpretation` contains nullable event type, guest count, location, date, time, meal type, service style, per-guest budget, and total budget, plus dietary requirements and notes. Missing facts remain `null` or `[]`.

Dietary counts preserve explicit evidence:

```json
{ "type": "vegan", "guestCount": 4 }
```

versus:

```json
{ "type": "vegetarian", "guestCount": null }
```

Eventa never derives a dietary count from attendance. It also separates service style from meal type: “buffet” maps to `serviceStyle` and does not populate `mealType` without a separately stated meal.

## 7. Menu generation

`EventMenu` contains a title, summary, assumptions, and stable-ID menu items. Each item records course, name, description, dietary tags, optional portion, ingredients, serving scope, and optional dietary allocation type.

Quantifiable ingredients normally include a positive per-serving amount in `g`, `kg`, `ml`, `l`, or `piece`. A genuinely unquantifiable ingredient may remain null and becomes an explicit downstream unresolved item. Provider correction is attempted before accepting missing metadata; deterministic code never fills a gap by guessing.

## 8. Deterministic quantity engine

For a known dietary audience:

```text
35 total guests
4 vegan guests

standard main = 35 − 4 = 31 servings
vegan main    = 4 servings
```

For each usable ingredient:

```text
required amount = per-serving amount × planned servings
```

Mass normalizes to grams, volume to millilitres, and compatible count units to pieces. Dimensions are never crossed. Names aggregate only after conservative case/whitespace normalization and only within a compatible canonical unit.

Unknown dietary counts, conflicting counts, and possible group overlap remain `needs_confirmation`. Valid serving overrides can resolve a menu item. Shared items use the full attendance. Missing or unsupported ingredient metadata is listed separately while calculable items continue. No hidden buffer is added.

## 9. Product data and matching

Eventa uses `data/transgourmet-products.canonical.csv`, a 392-product snapshot keyed by six-digit article number. It combines 136 manually supplied seed rows with 264 normalized public-source rows; eight article numbers overlap. Provenance is 128 seed-only, 256 scraped-only, and eight merged.

Verification status:

- 261 `verified_public_source`;
- 22 `official_product_verified_price_unverified`;
- 3 `partial_public_source`;
- 106 `seed_unverified`.

The first two statuses total 283 products with official public identity evidence; this is not a claim that all 283 have a verified current public price.

There are 172 populated prices: 60 from public-source evidence and 112 retained from seed provenance. Two records retain unresolved pack/sales-unit conflicts. A populated seed price is not represented as a verified current public price.

Sources are official publicly accessible Transgourmet Switzerland PDFs and product/catalogue pages. No authenticated protected webshop was accessed. The dataset is incomplete and time-sensitive.

The deterministic matcher scores normalized names, category/subcategory hints, keyword overlap, verification, price availability when otherwise equivalent, and unresolved conflicts. Results are:

- `matched`: safe automatic selection;
- `low_confidence`: no selection, with up to three alternatives;
- `unresolved`: no safe candidate.

## 10. Deterministic purchasing engine

For compatible pack metadata:

```text
packs              = ceil(required amount / canonical pack amount)
purchased quantity = packs × canonical pack amount
surplus             = purchased quantity − required amount
```

The engine supports `per_pack`, `per_kg`, `per_liter`, and `per_piece` price bases when units are compatible. It does not invent density conversions, variable-weight pack prices, missing packs, or missing prices.

The budget returns a known subtotal, priced/unpriced/unresolved counts, cost per guest from known prices, and comparisons with explicitly supplied targets. It can remain partial. `totalBudget` is never derived from `budgetPerGuest × guestCount`.

Shopping lines remain visible as `ready`, `needs_confirmation`, `unresolved`, or `unpriced`, and are grouped into useful purchasing categories. An explicit `alreadyInStock` flag keeps a line visible while excluding it from purchase and budget.

## 11. Frontend and hosting

The production frontend is hosted at [eventa-five.vercel.app](https://eventa-five.vercel.app) and targets the Railway API through public `VITE_API_BASE_URL`. The API health endpoint is [eventa-production-3df2.up.railway.app/api/health](https://eventa-production-3df2.up.railway.app/api/health).

Railway holds provider secrets and `FRONTEND_ORIGIN`; Vercel receives only the public API base URL. Railway supplies `PORT`; Eventa binds to `0.0.0.0`. Local Vite uses the port-8787 proxy.

## 12. Reliability and error handling

- Typed application errors map validation, configuration, rate limit, temporary provider, invalid output, internal, and not-found failures to safe HTTP responses.
- Every response receives `X-Request-Id`; structured logs contain safe endpoint, operation, status, duration, retry, and fallback metadata.
- Prompts, bodies, AI output, headers, keys, environment dumps, and stack traces are excluded from public errors/log fields.
- Bodies are capped at 256 KiB and responses use `Cache-Control: no-store`.
- The five-minute server timeout accommodates bounded provider recovery.
- `/api/health` reports liveness and safe configuration state without spending provider quota.
- Quantity, matching, and purchasing endpoints return partial results instead of failing an entire plan because one line needs review.

## 13. Security

`KICONNECT_API_KEY` exists only in the Railway/server environment. `.env`, `.env.local`, and `.env.*` are ignored while `.env.example` contains placeholders. Secrets must never use a `VITE_*` name; `VITE_API_BASE_URL` is intentionally public.

External input and provider output are validated. Production CORS never uses a wildcard. The QR prototype has no login or persistent prompt store, so the API remains a compute service rather than a repository for sensitive event data.

## 14. Testing strategy

Vitest covers:

- request/response schemas and normalization;
- KI:connect transport classification, corrective generation, and model fallback;
- cache TTL, eviction, failure behavior, and in-flight deduplication;
- dietary allocation, ambiguity, overrides, units, rounding, aggregation, and partial quantities;
- catalogue loading, product scoring, alternatives, conflicts, and determinism;
- pack calculations, supported price bases, partial budgets, grouping, and stock handling;
- frontend response validation, interpretation mapping, menu prefetch, and single-flight behavior;
- port precedence and CORS policy.

Deterministic quantity and matching verifiers consume no provider quota. Live provider and benchmark scripts are kept separate.

## 15. Known limitations and evolution

- The canonical data is a snapshot, not a live complete catalogue, current stock system, or authorized ordering API.
- Price coverage is incomplete; partial budgets are not procurement quotes.
- Low-confidence products and ambiguous dietary overlap need human confirmation.
- KI:connect availability, latency, and quota remain external constraints.
- Caches and backend state are process-local; there is no persistent plan database.
- Authentication, saved collaborative plans, checkout, and order submission are not implemented.

A production evolution would replace the snapshot adapter with an authorized versioned catalogue/feed, add freshness and stock semantics, persist plans, add authentication/privacy controls, use shared caching and observability, and integrate ordering only through an approved Transgourmet interface. The AI/deterministic boundary should remain unchanged.
