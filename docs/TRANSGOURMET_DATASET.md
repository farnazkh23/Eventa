# Transgourmet dataset

Eventa uses a checked-in hackathon catalogue snapshot built from official, publicly accessible Transgourmet Switzerland documents and public product/catalogue pages, plus a curated seed dataset. The extraction did not authenticate to or scrape a protected webshop. Missing values remain empty/null; no product, price, pack size, ingredient, allergen, origin, or provenance is invented.

## Dataset layers

| File | Purpose | Current rows |
|---|---|---:|
| `data/transgourmet-products.seed.csv` | Curated seed records retained with seed provenance | 136 |
| `data/transgourmet-products.normalized.csv` | Normalized official public-source extraction | 264 |
| `data/transgourmet-products.canonical.csv` | Article-number union used by Eventa | 392 |

Eight article numbers occur in both seed and normalized inputs. Therefore the canonical provenance split is:

- 128 seed-only;
- 256 scraped-only;
- eight merged;
- 392 unique article numbers total.

This explains the earlier confusing “128 seed-only” figure: the seed has 136 rows, of which eight overlap the scraped dataset.

## Source and normalization pipeline

```powershell
npx tsx scripts/scrape-transgourmet.ts
npx tsx scripts/normalize-transgourmet.ts
npx tsx scripts/validate-products.ts
.\scripts\merge-transgourmet-products.ps1
```

The scraper processes a curated manifest of public PDFs sequentially, waits between requests, retries transient failures, rejects protected-source responses, and checkpoints each source under `data/raw/transgourmet/`. Combined candidates are stored in `data/intermediate/transgourmet-scraped.json`.

Normalization extracts only visible evidence, normalizes supported units, deduplicates by six-digit article number, and writes the 264-row normalized dataset. `validate-products.ts` validates that normalized public-source layer.

The PowerShell merge then unions seed and normalized rows by `articleNumber`, prefers nonblank official scraped identity/pack/source metadata, preserves seed prices when scraped prices are absent, records provenance per field, retains explicit conflict flags, and validates canonical uniqueness and field preservation. Evidence-backed adjudications are listed explicitly in the merge script rather than hidden in application code.

## Provenance and verification

Canonical rows retain:

- row provenance: `seed`, `scraped`, or `merged`;
- identity, pack, and price provenance;
- source and resolution URLs when available;
- extraction/verification timestamp where available;
- verification status;
- name/pack conflict flags, details, and resolution notes.

Verification statuses mean:

- `verified_public_source` — official public evidence contains the article identity and parseable pack evidence;
- `official_product_verified_price_unverified` — official product identity is supported, but the retained price is not verified by that public source;
- `partial_public_source` — an official source identifies the record but core metadata needs review;
- `seed_unverified` — retained seed data without official public-source verification in this snapshot.

These labels are not freshness guarantees. Public promotional documents and product pages are time-sensitive.

## Current canonical summary

Generated and reconciled on 22 August 2026:

| Category | Products |
|---|---:|
| `bread_bakery` | 4 |
| `dairy_eggs` | 37 |
| `dessert_ingredients` | 10 |
| `fish_seafood` | 36 |
| `meat_poultry` | 45 |
| `non_alcoholic_drinks` | 25 |
| `plant_based` | 73 |
| `rice_pasta_grains` | 23 |
| `sauces_condiments` | 29 |
| `vegetables_fruit` | 110 |
| **Total** | **392** |

Verification breakdown:

| Status | Products |
|---|---:|
| `verified_public_source` | 261 |
| `official_product_verified_price_unverified` | 22 |
| `partial_public_source` | 3 |
| `seed_unverified` | 106 |

Together, `verified_public_source` and `official_product_verified_price_unverified` account for **283 products with official public identity evidence**. That total does not imply that all 283 have a verified current public price.

Price breakdown:

- 172 rows have a populated `priceCHF`;
- 60 prices have scraped public promotional provenance;
- 112 prices were retained from seed provenance;
- 220 rows have no price.

A populated seed price must not be described as a publicly verified current price. Purchasing results remain partial when price or compatible price-basis evidence is unavailable.

Two rows retain explicit unresolved sales-unit/pack conflicts: article `012060` and article `152501`. The matcher penalizes conflicted products, and the purchasing engine refuses pack calculation for a selected conflicted record.

## How Eventa uses the dataset

```text
menu ingredient
→ normalized ingredient requirement (g / ml / piece)
→ deterministic product matcher
→ selected high-confidence or candidate canonical product
→ deterministic purchasing engine
→ pack count / purchased quantity / surplus / available price
→ partial or complete budget and grouped shopping line
```

The matcher uses normalized name evidence, optional taxonomy hints, keyword overlap, verification/price signals, and conflict penalties. It never invents a product. High-confidence results can be selected automatically; low-confidence and unresolved results retain alternatives or review reasons without a selected product.

The purchasing engine uses only compatible validated pack and price metadata. It never invents density conversions, pack sizes, price bases, or prices. Unresolved and unpriced lines remain visible.

## Scope and future adapter

This is a limited hackathon snapshot, not the full Transgourmet assortment and not a live price feed. It does not imply official API access, stock availability, checkout, or ordering capability. A future authorized Transgourmet API/feed could replace the catalogue loader behind the same canonical product/matcher boundary while preserving deterministic calculations and provenance requirements.
