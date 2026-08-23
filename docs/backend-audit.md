# Eventa backend audit

> **Historical engineering snapshot — 22 August 2026.** Gemini was evaluated earlier in development and was later replaced by KI:connect for the final Eventa prototype. The provider, implementation-status, and deployment statements below describe that earlier investigation and are not current architecture. See [README.md](../README.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [TECHNICAL_REPORT.md](TECHNICAL_REPORT.md) for current repository truth.

## What changed after this audit

- A 392-product canonical Transgourmet hackathon dataset was added with provenance, verification, price provenance, and conflict metadata.
- Deterministic product normalization, ranking, confidence states, alternatives, and conflict down-ranking were implemented behind `POST /api/match-products`.
- A deterministic purchasing engine and `POST /api/create-purchasing-plan` were added for pack recommendations, purchased quantity, surplus, partial budgets, already-in-stock overrides, and grouped shopping lines.
- Railway `PORT`/`0.0.0.0` networking and narrow `FRONTEND_ORIGIN` CORS support replaced the deployment limitations recorded below.
- KI:connect replaced the evaluated Gemini adapter. Mistral Small 4 is the production primary and GPT OSS 120B is the supported fallback.

The original Gemini HTTP 429 investigation remains useful evidence of an external quota/rate-limit limitation and is intentionally preserved.

## 1. Current architecture

Eventa is a small React/TypeScript application with a Node `http` API. Shared contracts describe interpretations, menus, and quantity plans. Zod validates requests and Gemini structured output. Gemini interprets briefs and proposes per-serving menus; deterministic code performs allocation, conversion, aggregation, and confirmation handling.

The server composes one `AIProvider` at startup. `GeminiProvider` implements interpretation and menu generation. A bounded in-memory decorator provides successful-result caching and identical in-flight request deduplication.

## 2. What is already strong

- Gemini JSON schemas guide output, then strict Zod schemas independently validate it.
- Model-provided menu IDs are rejected; Eventa creates stable IDs.
- Policy checks block derived allocation numbers, preserving the deterministic arithmetic boundary.
- Dietary counts distinguish explicit values from unknowns; unknowns require confirmation.
- Quantity and normalization logic is focused, tested, and AI-independent.
- Keys remain server-only, bodies are size-bounded, responses use `no-store`, and browser errors are safe.

## 3. Technical debt and risks

- Browser response schemas duplicate server schemas and can drift.
- Raw Node routing is clear at this size but repeats method/path/body handling.
- Cache TTL/size are fixed sensible defaults; only enable/disable is configurable.
- Cache and deduplication are per-process and vanish on restart—appropriate for a demo, not multi-instance coordination.
- Verification scripts print approved sample inputs/results and must remain development-only.
- The repository encoding sweep is complete; user-facing copy and verification fixtures use valid UTF-8.

## 4. Public-demo reliability risks

- Gemini free-tier 429s and transient 503/network failures are the largest dependency risk.
- Valid JSON can still violate Eventa policy. Corrective regeneration consumes another call and is separate from transport retry.
- A cache cannot help the first request after restart.
- The process binds to `127.0.0.1`; public exposure depends on the hosting proxy.
- Deduplication protects identical concurrent requests, but many distinct prompts can still consume quota.

## 5. Security concerns

- The public prototype intentionally has no authentication. Keep routes compute-only and persist no personal data.
- Client request IDs are length-bounded labels, never authorization.
- Logs exclude request bodies, prompts, AI output, headers, environment variables, secrets, and stack traces.
- Health exposes only version and AI configuration presence.
- If deployed cross-origin, configure a narrow origin policy at the edge; do not enable wildcard credentialed CORS.

## 6. Cleaner implementation opportunities

- If several routes are added, use a tiny validation/timing route wrapper rather than a framework.
- Share runtime response schemas only if frontend/server drift becomes recurring.
- Add dependency readiness only when a cheap provider probe exists; a Gemini health call would waste quota.

## 7. Delivery status

### IMPLEMENTED

- Server-side Gemini event interpretation and menu generation with structured output and strict validation.
- Typed errors, request IDs, JSON logs, timing, bounded retry/backoff/jitter/timeouts, provider abstraction, identical-request deduplication, short-lived cache, and safe health.
- Deterministic serving allocation and required ingredient quantity totals through `POST /api/calculate-quantities`.
- Automated verification: 82 tests were passing when this audit was completed.

### CURRENTLY INTEGRATING / NEXT STEP

- Connect deterministic quantity results to the existing frontend plan experience.
- Add Transgourmet product matching only after a real catalogue source and matching contract are approved.
- Package-size selection, package counts, purchased quantities, surplus, product pricing, final budget calculation, and shopping-list backend functionality are not implemented.
- Before demo day, run the live verifier against the deployed model/quota and warm one non-sensitive rehearsed scenario.

## 8. Deliberately rejected overengineering

- `delete:` no database, Redis, queue, or cache service; memory is enough for one demo instance.
- `yagni:` no dependency-injection container; startup composition is explicit.
- `native:` no logging dependency; JSON over platform output is sufficient.
- `delete:` no Gemini readiness call; health polling could amplify quota trouble.
- `delete:` no microservices, CQRS, event sourcing, Kubernetes, or observability platform.

Net: no justified dependency additions; hardening uses Node and existing packages.

## First-attempt failure investigation

The live three-pass flow verifier reproduced a first-flow failure on 22 August 2026. Gemini returned HTTP 429 on all three event-interpretation transport attempts. Provider retry metadata produced 35-second and 59-second waits; after the third 429, Eventa safely returned HTTP 503. Menu generation was never reached. For this reproduction, the root cause is Gemini rate limiting/quota—not a duplicate frontend request, 503, timeout, or schema/policy correction.

Static inspection found one menu call site and a frontend in-flight guard, so duplicate React calls are unlikely in the current tree. Schema correction remains separately instrumented because it can explain a different future incident. Safe category logs distinguish `gemini_429`, `gemini_503`, `timeout`, `structured_output_validation`, configuration/request errors, and transient network failures per attempt.
