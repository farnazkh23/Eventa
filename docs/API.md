# Eventa API

The Node server registers the six routes below. All POST bodies are JSON, capped at 256 KiB, and validated with strict Zod schemas. Successful payloads are returned directly, without a `data` wrapper.

Every response includes `X-Request-Id`; JSON responses also include `Cache-Control: no-store`. Allowed cross-origin requests receive the configured CORS headers; OPTIONS preflight returns 204.

## Errors

Public failures use one safe envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the submitted details and try again."
  }
}
```

Current error codes include `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `AI_RATE_LIMITED` (503), `AI_TEMPORARILY_UNAVAILABLE` (503), `AI_INVALID_OUTPUT` (503), `MISSING_CONFIGURATION` (503), and `INTERNAL_ERROR` (500). Provider payloads and stack traces are not exposed.

## `GET /api/health`

Returns liveness and safe provider configuration state. It does not call the provider.

```json
{
  "status": "ok",
  "version": "0.1.0",
  "aiConfigured": true,
  "aiProvider": "kiconnect"
}
```

## `POST /api/interpret-event`

### Request

`description` must contain 10–1000 trimmed characters.

```json
{
  "description": "Birthday dinner in Zürich for 35 guests. 4 are vegan and we want a seated dinner."
}
```

### Response — `EventInterpretation`

Missing scalar facts are `null`; list fields are arrays. Dietary counts are present only when explicitly supported by the description.

```json
{
  "eventType": "birthday",
  "guestCount": 35,
  "location": "Zürich",
  "date": null,
  "time": null,
  "mealType": "dinner",
  "serviceStyle": "seated",
  "budgetPerGuest": null,
  "totalBudget": null,
  "dietaryRequirements": [
    { "type": "vegan", "guestCount": 4 }
  ],
  "additionalNotes": []
}
```

## `POST /api/generate-menu`

### Request — `GenerateMenuRequest`

`event` is an `EventInterpretation`. `originalDescription` is optional and, when supplied, must contain 10–1000 trimmed characters.

```json
{
  "event": {
    "eventType": "birthday",
    "guestCount": 35,
    "location": "Zürich",
    "date": null,
    "time": null,
    "mealType": "dinner",
    "serviceStyle": "seated",
    "budgetPerGuest": null,
    "totalBudget": null,
    "dietaryRequirements": [
      { "type": "vegan", "guestCount": 4 }
    ],
    "additionalNotes": []
  },
  "originalDescription": "Birthday dinner in Zürich for 35 guests. 4 are vegan and we want a seated dinner."
}
```

### Response — `EventMenu`

IDs are generated deterministically by Eventa. Ingredient quantities are per-serving planning recommendations, not event totals.

```json
{
  "title": "Birthday dinner",
  "summary": "A seasonal seated dinner with a vegan main alternative.",
  "items": [
    {
      "id": "main-herb-roasted-chicken-1abc234",
      "course": "main",
      "name": "Herb-roasted chicken",
      "description": "Roasted chicken with seasonal vegetables.",
      "dietaryTags": [],
      "portion": { "amount": 280, "unit": "g" },
      "ingredients": [
        { "name": "chicken breast", "amountPerServing": 180, "unit": "g" }
      ],
      "servingScope": "all_guests",
      "dietaryAllocationType": null
    },
    {
      "id": "main-mushroom-risotto-2def345",
      "course": "main",
      "name": "Mushroom risotto",
      "description": "A plant-based risotto with herbs.",
      "dietaryTags": ["vegan"],
      "portion": { "amount": 280, "unit": "g" },
      "ingredients": [
        { "name": "risotto rice", "amountPerServing": 90, "unit": "g" }
      ],
      "servingScope": "dietary_option",
      "dietaryAllocationType": "vegan"
    }
  ],
  "planningAssumptions": [
    "The confirmed vegan guest count is retained for deterministic quantity planning."
  ]
}
```

Menu courses are `starter`, `main`, `side`, `vegetarian`, `vegan`, `dessert`, `beverage`, or `other`; generated menus use dietary tags rather than `vegetarian`/`vegan` as a main-course position. Serving scopes are `all_guests`, `dietary_option`, or `shared`.

## `POST /api/calculate-quantities`

### Request — `CalculateQuantitiesRequest`

The event must have a positive integer `guestCount`. `menu` is the validated `EventMenu`. Optional overrides reference real menu item IDs, use non-negative integer servings, and cannot exceed the event guest count.

```json
{
  "event": {
    "eventType": "birthday",
    "guestCount": 35,
    "location": "Zürich",
    "date": null,
    "time": null,
    "mealType": "dinner",
    "serviceStyle": "seated",
    "budgetPerGuest": null,
    "totalBudget": null,
    "dietaryRequirements": [
      { "type": "vegan", "guestCount": 4 }
    ],
    "additionalNotes": []
  },
  "menu": {
    "title": "Birthday dinner",
    "summary": "A main course with a vegan alternative.",
    "items": [
      {
        "id": "standard-main",
        "course": "main",
        "name": "Chicken main",
        "description": "Chicken with vegetables.",
        "dietaryTags": [],
        "portion": null,
        "ingredients": [
          { "name": "chicken breast", "amountPerServing": 180, "unit": "g" }
        ],
        "servingScope": "all_guests",
        "dietaryAllocationType": null
      },
      {
        "id": "vegan-main",
        "course": "main",
        "name": "Vegan risotto",
        "description": "Plant-based risotto.",
        "dietaryTags": ["vegan"],
        "portion": null,
        "ingredients": [
          { "name": "risotto rice", "amountPerServing": 90, "unit": "g" }
        ],
        "servingScope": "dietary_option",
        "dietaryAllocationType": "vegan"
      }
    ],
    "planningAssumptions": []
  },
  "servingOverrides": []
}
```

### Response — `QuantityPlan`

```json
{
  "guestCount": 35,
  "isComplete": true,
  "itemAllocations": [
    {
      "menuItemId": "standard-main",
      "menuItemName": "Chicken main",
      "course": "main",
      "plannedServings": 31,
      "status": "calculated"
    },
    {
      "menuItemId": "vegan-main",
      "menuItemName": "Vegan risotto",
      "course": "main",
      "plannedServings": 4,
      "status": "calculated"
    }
  ],
  "ingredientRequirements": [
    {
      "ingredientKey": "chicken breast:g",
      "name": "chicken breast",
      "amount": 5580,
      "unit": "g",
      "sourceMenuItemIds": ["standard-main"]
    },
    {
      "ingredientKey": "risotto rice:g",
      "name": "risotto rice",
      "amount": 360,
      "unit": "g",
      "sourceMenuItemIds": ["vegan-main"]
    }
  ],
  "unresolved": [],
  "unresolvedIngredients": [],
  "assumptions": [
    "Required quantities equal planned servings multiplied by per-serving amounts; no catering buffer is included.",
    "Shared menu items use the full event guest count as their serving basis.",
    "Dietary groups are never assumed to be mutually exclusive; ambiguous overlap requires confirmation."
  ]
}
```

Partial plans still return calculated ingredients. Unresolved item allocations appear in `unresolved`; missing/unsupported ingredient quantities also appear in `unresolvedIngredients`. `isComplete` is false when any item remains unresolved.

## `POST /api/match-products`

### Request — `MatchProductsRequest`

Inputs normally come from `QuantityPlan.ingredientRequirements`. Optional `categoryHint` and `subcategoryHint` can strengthen deterministic taxonomy evidence.

```json
{
  "ingredients": [
    {
      "ingredientKey": "risotto rice:g",
      "name": "risotto rice",
      "amount": 7200,
      "unit": "g",
      "sourceMenuItemIds": ["main-risotto"]
    }
  ]
}
```

### Response — `ProductMatchPlan`

Each match has status `matched`, `low_confidence`, or `unresolved`. Only `matched` receives a selected product; alternatives are capped at three.

```json
{
  "matches": [
    {
      "ingredientKey": "risotto rice:g",
      "ingredientName": "risotto rice",
      "normalizedIngredientName": "risotto rice",
      "requiredAmount": 7200,
      "requiredUnit": "g",
      "sourceMenuItemIds": ["main-risotto"],
      "status": "matched",
      "selectedProduct": {
        "articleNumber": "411170",
        "name": "Natura Bio Langkornreis Parboiled, 5 kg",
        "brand": "Natura",
        "category": "rice_pasta_grains",
        "subcategory": "rice_long_grain",
        "packSizeValue": 5,
        "packSizeUnit": "kg",
        "salesUnit": "bag",
        "unitsPerSalesUnit": 1,
        "priceCHF": null,
        "priceBasis": null,
        "sourceUrl": "https://www-static.transgourmet.ch/public/2022-06/kw24-bgh-natura-sortimentsbroeschuere-d.pdf",
        "verificationStatus": "verified_public_source",
        "hasUnresolvedConflict": false
      },
      "score": 78,
      "reason": "Matched using normalized name, taxonomy, and catalogue evidence.",
      "alternatives": []
    }
  ],
  "summary": {
    "totalIngredients": 1,
    "matched": 1,
    "lowConfidence": 0,
    "unresolved": 0,
    "selectedProductsWithPrice": 0
  }
}
```

Product fields are sourced from the canonical snapshot. Names, scores, statuses, and prices above are illustrative contract values; clients must use the actual endpoint response rather than assuming this selection.

## `POST /api/create-purchasing-plan`

### Request — `CreatePurchasingPlanRequest`

`event` must have a positive guest count. `productMatches` is the validated matcher result. Optional stock overrides must reference existing ingredient keys and are unique per ingredient.

```json
{
  "event": {
    "eventType": "corporate event",
    "guestCount": 120,
    "location": "Bern",
    "date": null,
    "time": null,
    "mealType": "dinner",
    "serviceStyle": "buffet",
    "budgetPerGuest": 45,
    "totalBudget": null,
    "dietaryRequirements": [],
    "additionalNotes": []
  },
  "productMatches": {
    "matches": [
      {
        "ingredientKey": "rice:g",
        "ingredientName": "rice",
        "normalizedIngredientName": "rice",
        "requiredAmount": 7200,
        "requiredUnit": "g",
        "sourceMenuItemIds": ["main-rice"],
        "status": "matched",
        "selectedProduct": {
          "articleNumber": "411170",
          "name": "Natura Bio Langkornreis Parboiled, 5 kg",
          "brand": "Natura",
          "category": "rice_pasta_grains",
          "subcategory": "rice_long_grain",
          "packSizeValue": 5,
          "packSizeUnit": "kg",
          "salesUnit": "bag",
          "unitsPerSalesUnit": 1,
          "priceCHF": null,
          "priceBasis": null,
          "sourceUrl": "https://www-static.transgourmet.ch/public/2022-06/kw24-bgh-natura-sortimentsbroeschuere-d.pdf",
          "verificationStatus": "verified_public_source",
          "hasUnresolvedConflict": false
        },
        "score": 78,
        "reason": "Matched using deterministic catalogue evidence.",
        "alternatives": []
      }
    ],
    "summary": {
      "totalIngredients": 1,
      "matched": 1,
      "lowConfidence": 0,
      "unresolved": 0,
      "selectedProductsWithPrice": 0
    }
  },
  "stockOverrides": [
    { "ingredientKey": "rice:g", "alreadyInStock": false }
  ]
}
```

### Response excerpt — `PurchasingPlan`

The complete response has `lines`, `groups`, `budget`, `summary`, and `assumptions`. Each non-empty group repeats the complete line objects belonging to its shopping category. The excerpt below omits that repeated `groups` field only for readability.

```json
{
  "lines": [
    {
      "ingredientKey": "rice:g",
      "ingredientName": "rice",
      "requiredAmount": 7200,
      "requiredUnit": "g",
      "sourceMenuItemIds": ["main-rice"],
      "matchStatus": "matched",
      "selectedProduct": {
        "articleNumber": "411170",
        "name": "Natura Bio Langkornreis Parboiled, 5 kg",
        "brand": "Natura",
        "category": "rice_pasta_grains",
        "subcategory": "rice_long_grain",
        "packSizeValue": 5,
        "packSizeUnit": "kg",
        "salesUnit": "bag",
        "unitsPerSalesUnit": 1,
        "priceCHF": null,
        "priceBasis": null,
        "sourceUrl": "https://www-static.transgourmet.ch/public/2022-06/kw24-bgh-natura-sortimentsbroeschuere-d.pdf",
        "verificationStatus": "verified_public_source",
        "hasUnresolvedConflict": false
      },
      "pack": {
        "packSize": 5,
        "packUnit": "kg",
        "unitsPerSalesUnit": 1,
        "canonicalPackAmount": 5000,
        "canonicalUnit": "g",
        "recommendedPacks": 2,
        "recommendedPurchaseAmount": 10000,
        "surplusAmount": 2800
      },
      "packsToBuy": 2,
      "purchaseAmount": 10000,
      "purchaseUnit": "g",
      "surplusAmount": 2800,
      "knownPriceCHF": null,
      "priceBasis": null,
      "lineTotalCHF": null,
      "status": "unpriced",
      "category": "pantry_grains",
      "alreadyInStock": false,
      "reason": "Pack quantity is calculated, but no compatible verified price and price basis are available."
    }
  ],
  "budget": {
    "knownSubtotalCHF": 0,
    "pricedLineCount": 0,
    "unpricedLineCount": 1,
    "unresolvedLineCount": 0,
    "alreadyInStockLineCount": 0,
    "costPerGuestFromKnownPricesCHF": 0,
    "budgetPerGuestTargetCHF": 45,
    "totalBudgetTargetCHF": null,
    "differenceFromPerGuestTargetCHF": -45,
    "differenceFromTotalTargetCHF": null,
    "isComplete": false
  },
  "summary": {
    "totalLines": 1,
    "ready": 0,
    "needsConfirmation": 0,
    "unresolved": 0,
    "unpriced": 1,
    "alreadyInStock": 0
  },
  "assumptions": [
    "Pack counts use the ceiling of required quantity divided by validated compatible pack size.",
    "No catering buffer, density conversion, product price, or missing pack metadata is invented.",
    "Known budget subtotal includes only priced products that are not marked already in stock.",
    "Total budget is never derived from the per-guest budget."
  ]
}
```

Shopping-line statuses are `ready`, `needs_confirmation`, `unresolved`, or `unpriced`. Shopping categories are `meat_fish`, `vegetables_fruit`, `dairy`, `pantry_grains`, `sauces`, `bakery`, `drinks`, `plant_based`, `desserts`, and `review`. Supported deterministic price bases are `per_pack`, `per_kg`, `per_liter`, and `per_piece` when unit metadata is compatible.
