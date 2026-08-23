# Eventa project guidance

Eventa is a mobile-first, AI-assisted event and catering planner built as a Transgourmet / Prodega hackathon prototype.

## Sources of truth

- Treat implemented routes, handlers, Zod schemas, shared contracts, and imported domain services as the authority for capability claims.
- Treat `data/transgourmet-products.canonical.csv` as the matcher’s catalogue snapshot. Preserve its article-number identity and provenance/conflict metadata.
- Before UI work, inspect every image in `docs/design-reference/` at full resolution. Preserve the lowercase `eventa.` brand, Transgourmet-inspired red accent, neutral surfaces, mobile proportions, and one-main-action-per-screen flow.
- Do not claim that a backend stage is connected merely because the UI contains a card or pending label for it.

## Architecture rules

- Preserve the probabilistic/deterministic boundary: **AI reasons; Eventa calculates.**
- KI:connect is Eventa's AI provider. Mistral Small 4 (`mistralai-mistral-small-4-119b`) is primary and GPT OSS (`gpt-oss-120b`) is the supported fallback.
- Never ask an LLM to perform authoritative serving, quantity, unit, product, pack, surplus, pricing, budget, or shopping-list arithmetic.
- Keep dietary serving allocation, quantity calculation, unit conversion, ingredient normalization, product matching, purchasing, and budgeting deterministic and testable in TypeScript.
- Treat AI and external data as untrusted. Validate with Zod/runtime schemas and normalize before domain use.
- Never fabricate catalogue products, article numbers, prices, price bases, pack sizes, provenance, official API access, or completion status. Missing facts remain null/unavailable or unresolved.
- Prefer officially verified canonical products, but retain low-confidence/unresolved states and alternatives when evidence is insufficient.
- Preserve source, verification, seed/scraped/merged provenance, and conflict flags when changing catalogue tooling.
- Keep partial results useful: one unknown dietary allocation, ingredient, match, pack, or price must not erase valid deterministic results elsewhere.

## Security and deployment

- Keep `KICONNECT_API_KEY` and all provider credentials server-side. Never expose secrets through `VITE_*`, client code, logs, responses, or committed files. `VITE_API_BASE_URL` is a public URL, not a credential.
- `.env.local` and secret environment files must remain ignored; `.env.example` contains placeholders only.
- Keep request validation, body limits, safe typed errors, request IDs, and narrow configured CORS behavior intact.
- Do not add authentication, persistence, a live catalogue claim, or order submission unless those capabilities are explicitly implemented and authorized.

## Frontend direction

- Design mobile-first and retain the current visual system rather than introducing a competing one.
- Keep screens minimal, scannable, keyboard accessible, and responsive, with stable viewport behavior and touch-sized controls.
- Prefer reusable tokens and components. Avoid image-heavy catalogue layouts and unnecessary food photography.
- The QR path must remain usable without login.
- Pending/unconnected stages must be labelled honestly and must never display mock totals as real backend output.

## Engineering workflow

- Keep hackathon architecture lightweight; avoid unnecessary frameworks, dependencies, services, or speculative abstractions.
- Prefer pure domain functions and focused tests for deterministic logic.
- Reuse shared contracts and existing HTTP/provider utilities instead of creating parallel versions.
- Preserve user work and unrelated changes. Do not use destructive Git commands without explicit authorization.
- Update `README.md` and relevant files under `docs/` whenever provider defaults, endpoints, datasets, frontend connections, or capability status changes.
- Before handoff, run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`, plus relevant deterministic verification scripts.
- Clearly distinguish live AI scripts from quota-free deterministic verification.
