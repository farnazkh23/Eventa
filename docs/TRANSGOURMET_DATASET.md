# Transgourmet dataset

This hackathon dataset is built only from official, publicly accessible Transgourmet Switzerland documents. The authenticated Webshop and Prodega Easy catalogue are deliberately not accessed. General prices are not publicly available there; price fields remain blank unless an official public document explicitly displays a price.

## Pipeline

```powershell
npx tsx scripts/scrape-transgourmet.ts
npx tsx scripts/normalize-transgourmet.ts
npx tsx scripts/validate-products.ts
```

The scraper uses polite sequential requests, a 1.2-second delay, three bounded retries, and a descriptive user agent. Each official PDF is checkpointed as `data/raw/transgourmet/<source>.json`, so reruns resume without downloading completed sources. Combined candidates are stored in `data/intermediate/transgourmet-scraped.json`.

Normalization preserves rows from `data/transgourmet-products.csv`, deduplicates on the six-digit article number, normalizes supported units, and writes `data/transgourmet-products.normalized.csv`. Missing values remain empty. Heuristic category and dietary labels are based only on visible source text; no ingredient, allergen, origin, or price is inferred.

## Verification status

- `verified_public_source`: official public source contains article number, name, and parseable pack evidence.
- `partial_public_source`: official source identifies the article, but core pack evidence needs review.
- Seed rows retain their supplied status.

The source manifest is intentionally curated toward catering-useful food categories rather than random catalogue coverage. Public promotional documents are time-sensitive; `verifiedAt` records extraction time, and source URLs remain attached for review.

## Seed note

The requested seed file was not present in the repository or Git history when this branch was created. An empty schema-compatible seed was created at the required path so future manually verified rows can be preserved and merged.

## Current dataset result

Generated on 22 August 2026 from the source manifest in the scraper:

| Category | Products |
|---|---:|
| `dairy_eggs` | 20 |
| `fish_seafood` | 30 |
| `meat_poultry` | 30 |
| `non_alcoholic_drinks` | 16 |
| `plant_based` | 70 |
| `rice_pasta_grains` | 14 |
| `sauces_condiments` | 14 |
| `vegetables_fruit` | 70 |
| **Total** | **264** |

- Products with a price explicitly mapped from a public promotional document: **60**
- Products meeting the documented `verified_public_source` rule: **261**
- Partial records retained for manual review: **3**

The public source set did not yield sufficiently reliable bread/bakery or dessert-ingredient records during this run, so none were invented to fill those categories.
