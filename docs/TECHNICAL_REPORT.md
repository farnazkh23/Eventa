# Eventa Technical Report

## 1. Executive Summary

eventa. is a mobile-first catering planner for the Transgourmet / Prodega hackathon challenge. It converts a natural-language event brief into validated event facts and a catering menu, then applies deterministic domain logic to calculate serving allocations and ingredient quantities. The architecture intentionally prevents generative AI from owning arithmetic, product pricing, or purchasing decisions.

## 2. Product Objective

The product reduces the manual translation between an organiser’s brief and an actionable catering plan. The intended complete journey covers dietary needs, menu design, quantities, catalogue products, packs, budget, and shopping list. The current repository implements the journey through the quantity API; catalogue and commercial calculations remain pending.

## 3. User Journey

1. A guest describes an event without authentication.
2. Gemini extracts structured facts such as guest count, location, service style, budget, and dietary requirements.
3. The guest reviews and can edit the interpretation.
4. Gemini proposes a validated catering menu.
5. The UI presents the real generated menu and explicitly marks quantities, products, and budget as pending.
6. Separately, the implemented quantity API can calculate deterministic allocations and ingredient totals from a confirmed event and menu.

## 4. System Architecture

The React frontend calls a small Node TypeScript HTTP API. Shared TypeScript contracts define event, menu, and quantity objects. Runtime trust boundaries use Zod. At startup, the API composes a model-agnostic `AIProvider`, currently implemented by Gemini, and wraps it with in-memory deduplication and caching. The quantity engine has no provider dependency.

## 5. AI Architecture

AI is restricted to tasks where probabilistic reasoning adds value: extracting meaning from free text and proposing a context-appropriate menu. Gemini is requested to return JSON matching explicit response schemas. Eventa then validates that output with strict Zod schemas and normalizes it before it becomes domain data.

`AIProvider` exposes `interpret(...)` and `generate(...)`; `GeminiProvider` is the current implementation. This keeps domain and API code from depending directly on Gemini without adding a dependency-injection framework.

Transport retry and semantic correction are separate. 429, 503, timeouts, and selected network failures can receive bounded retries. A syntactically invalid or policy-invalid menu receives at most one corrective regeneration.

## 6. Event Interpretation

The interpretation schema includes nullable event type, guest count, location, date, time, meal type, service style, per-guest and total budgets, additional notes, and structured dietary requirements.

```json
{ "type": "vegan", "guestCount": 4 }
```

means four guests were explicitly identified as vegan, while:

```json
{ "type": "vegetarian", "guestCount": null }
```

means vegetarian catering is required but the count is unknown. `null` is deliberate: Eventa does not invent an allocation. Legacy dietary strings are accepted only through a compatibility schema and normalized to the structured form.

## 7. Menu Generation

Menu output contains a title, summary, two or more menu items, and planning assumptions. Each item has a course, name, description, dietary tags, optional suggested portion, per-serving ingredients, and a serving scope:

- `all_guests`: the standard item for an audience or course;
- `dietary_option`: an alternative tied to a dietary audience;
- `shared`: an item whose serving basis is the full event count.

The model cannot supply trusted IDs; Eventa derives stable IDs from normalized course and item names. Zod rejects unknown fields and invalid bounds. A policy check also rejects planning assumptions containing unsupported derived allocations. The prompt explicitly prohibits specific products, prices, total quantities, package counts, and shopping lists, avoiding catalogue or pricing hallucination.

## 8. Deterministic Quantity Engine

This is the primary domain boundary: AI is not used for arithmetic.

For one known dietary alternative:

```text
35 guests
4 vegan

standard main = 35 − 4 = 31 portions
vegan main    = 4 portions

required ingredient quantity = amount per serving × planned servings
```

The engine first allocates dietary and shared items, then derives standard allocations where safe. Unknown counts require confirmation. Multiple dietary types are not assumed to be mutually exclusive; possible audience overlap prevents unsafe subtraction. Explicit serving overrides are supported for confirmed decisions.

Ingredient amounts are converted to canonical `g`, `ml`, or `piece` units, normalized by ingredient name, and aggregated across menu items. Unsupported units, missing amounts, or unresolved serving allocations produce a partial `QuantityPlan` with item-level status and reasons. Valid results are retained instead of discarding the entire calculation. No hidden catering safety buffer is applied; that assumption is returned explicitly.

## 9. Product Data Strategy

There is currently no Transgourmet catalogue dataset, matching adapter, or live API integration in this repository. The intended hackathon next step is a curated dataset behind a typed catalogue adapter. It would match normalized ingredient requirements to purchasable products, then deterministic code would calculate pack counts and prices. The adapter boundary would allow an official catalogue/API to replace the curated source later.

## 10. Frontend Architecture

The frontend is a feature-oriented React application using local context/reducer state. Reusable layout and UI components implement the mobile shell, header, navigation, cards, fields, buttons, and progress treatment. Screens use constrained internal scrolling and responsive CSS Modules while preserving a mobile workflow on wider displays.

Implemented routes cover event description, interpretation review, plan overview, and menu review. Only real event/menu data is presented as complete. Quantity, product, cart, and budget UI elements are disabled or labelled pending; the frontend does not fabricate backend totals.

## 11. Reliability and Error Handling

- Typed application errors map validation, configuration, provider, invalid-output, and internal failures to safe HTTP responses.
- Every API response receives `X-Request-Id`; request-scoped JSON logs include endpoint, operation, status, duration, and safe categories. Development retry diagnostics add attempt numbers and provider categories.
- Gemini calls have a 45-second request timeout and up to three transport attempts.
- Backoff includes jitter and respects bounded `Retry-After` metadata.
- Identical normalized requests share in-flight work server-side.
- Successful interpretations and menus use a five-minute, 100-entry in-memory cache keyed by SHA-256 hashes; it can be disabled.
- The frontend also guards menu generation with single-flight behavior.
- `GET /api/health` exposes only status, version, and whether AI is configured.

The live reliability verifier currently demonstrates a real external limitation: Gemini free-tier requests can remain rate-limited across all retry attempts.

## 12. Security

The Gemini API key is read from server environment configuration and never bundled into the browser. `.env.local` is ignored. Request bodies are capped and validated. Responses use `Cache-Control: no-store`. Browser errors do not expose provider payloads, stack traces, prompts, environment variables, or secrets. Logs intentionally omit request bodies and AI output. The QR prototype has no authentication and persists no user prompt data.

## 13. Testing Strategy

Vitest tests cover:

- interpretation, menu, and quantity schemas;
- compatibility and normalization behavior;
- stable menu IDs and menu arithmetic policy;
- 429/503/timeout retry classification and bounds;
- corrective menu regeneration;
- cache expiration, eviction, failure behavior, and in-flight deduplication;
- unit conversion and numeric rounding;
- dietary allocation, overlap ambiguity, overrides, ingredient aggregation, partial results, and deterministic repeatability;
- frontend service response validation, safe failures, single-flight behavior, and interpretation field mapping.

There is no React Testing Library dependency and no browser-rendered end-to-end suite. UI pending-state correctness is presently enforced by explicit component copy and disabled controls rather than component tests.

## 14. Known Limitations

- No product catalogue or live Transgourmet API integration.
- Quantity calculations are implemented in the API but not wired into the UI.
- No package, pricing, budget-total, shopping-list, checkout, or ordering integration.
- Gemini quota/rate limits can block a cold demo request.
- Cache and application state are in-memory and process-local.
- Refreshing the browser loses the current plan.
- No authentication or persistent event plans.
- No full browser/end-to-end test suite.

## 15. Production Evolution

The shortest credible production path is to add an official or curated Transgourmet catalogue adapter, deterministic pack/price calculation, persistent plans, appropriate authentication, production log collection and metrics, and deployment-aware cache/rate-limit controls. The existing provider boundary can support additional AI providers if there is a demonstrated resilience or compliance need.
