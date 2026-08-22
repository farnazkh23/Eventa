param(
  [string]$SeedPath = 'data/transgourmet-products.seed.csv',
  [string]$ScrapedPath = 'data/transgourmet-products.normalized.csv',
  [string]$OutputPath = 'data/transgourmet-products.canonical.csv'
)

$ErrorActionPreference = 'Stop'

function Has-Value([object]$Value) {
  return -not [string]::IsNullOrWhiteSpace([string]$Value)
}

function Prefer-Value([object]$Preferred, [object]$Fallback) {
  if (Has-Value $Preferred) { return [string]$Preferred }
  if (Has-Value $Fallback) { return [string]$Fallback }
  return ''
}

function Normalize-Text([object]$Value) {
  if (-not (Has-Value $Value)) { return '' }
  return (([string]$Value).Trim() -replace '\s+', ' ').ToLowerInvariant()
}

function Values-Conflict([object]$SeedValue, [object]$ScrapedValue, [switch]$Numeric) {
  if (-not (Has-Value $SeedValue) -or -not (Has-Value $ScrapedValue)) { return $false }
  if ($Numeric) {
    $seedNumber = 0.0
    $scrapedNumber = 0.0
    $seedValid = [double]::TryParse(
      ([string]$SeedValue),
      [Globalization.NumberStyles]::Float,
      [Globalization.CultureInfo]::InvariantCulture,
      [ref]$seedNumber
    )
    $scrapedValid = [double]::TryParse(
      ([string]$ScrapedValue),
      [Globalization.NumberStyles]::Float,
      [Globalization.CultureInfo]::InvariantCulture,
      [ref]$scrapedNumber
    )
    if ($seedValid -and $scrapedValid) { return $seedNumber -ne $scrapedNumber }
  }
  return (Normalize-Text $SeedValue) -ne (Normalize-Text $ScrapedValue)
}

function Pack-Summary([object]$Row) {
  if ($null -eq $Row) { return '' }
  return "value=$($Row.packSizeValue);unit=$($Row.packSizeUnit);salesUnit=$($Row.salesUnit);units=$($Row.unitsPerSalesUnit)"
}

function Uses-SeedFallback([object]$SeedRow, [object]$ScrapedRow, [string[]]$Fields) {
  if ($null -eq $SeedRow -or $null -eq $ScrapedRow) { return $false }
  foreach ($field in $Fields) {
    if (-not (Has-Value $ScrapedRow.$field) -and (Has-Value $SeedRow.$field)) { return $true }
  }
  return $false
}

function Is-ValidPrice([object]$Value) {
  $parsedPrice = [decimal]0
  return [decimal]::TryParse(
    ([string]$Value),
    [Globalization.NumberStyles]::Number,
    [Globalization.CultureInfo]::InvariantCulture,
    [ref]$parsedPrice
  ) -and $parsedPrice -ge 0
}

$seedRows = @(Import-Csv -Encoding UTF8 $SeedPath)
$scrapedRows = @(Import-Csv -Encoding UTF8 $ScrapedPath)
$seedByArticle = @{}
$scrapedByArticle = @{}

foreach ($row in $seedRows) {
  $key = ([string]$row.articleNumber).Trim()
  if (-not $key) { throw 'Seed dataset contains a blank articleNumber.' }
  if ($seedByArticle.ContainsKey($key)) { throw "Duplicate seed articleNumber: $key" }
  $seedByArticle[$key] = $row
}

foreach ($row in $scrapedRows) {
  $key = ([string]$row.articleNumber).Trim()
  if (-not $key) { throw 'Scraped dataset contains a blank articleNumber.' }
  if ($scrapedByArticle.ContainsKey($key)) { throw "Duplicate scraped articleNumber: $key" }
  $scrapedByArticle[$key] = $row
}

$allArticleNumbers = @($seedByArticle.Keys + $scrapedByArticle.Keys | Sort-Object -Unique)

# Evidence-backed adjudications for source conflicts. Keep this list explicit so
# canonical choices remain reproducible and unresolved differences stay flagged.
$officialResolutions = @{
  '012060' = @{
    Values = @{ name = "Val d'Arve Le Brie 1/1 Laib" }
    ResolvedFields = @('name')
    Note = 'Official promotions support the base product name. Published weights vary and piece versus generic package remains unresolved.'
    SourceUrl = 'https://www-static.transgourmet.ch/public/2024-05/kw22-bgh-last_minute-d.pdf'
  }
  '026340' = @{
    Values = @{ name = 'Suisse Yogourt 0,2% Mini assortiert'; packSizeValue = '90'; packSizeUnit = 'g'; unitsPerSalesUnit = '10' }
    ResolvedFields = @('name', 'packSizeValue')
    Note = 'Official promotion identifies the article as Suisse Yogourt 0,2% Mini assortiert, 10 x 90 g; canonical pack size is normalized per unit.'
    SourceUrl = 'https://www-static.transgourmet.ch/public/2024-02/kw09-bgh-lastminute-d.pdf'
  }
  '042592' = @{
    Values = @{ salesUnit = 'can' }
    ResolvedFields = @('name', 'salesUnit')
    Note = 'Official product page identifies a 1 kg can; the multilingual PDF name was extraction noise.'
    SourceUrl = 'https://web.transgourmet.ch/de/prodega-easy/catalog/article/042592'
  }
  '152501' = @{
    Values = @{ packSizeValue = '10.5'; packSizeUnit = 'kg' }
    ResolvedFields = @('name', 'packSizeValue')
    Note = 'Official promotions identify article 152501 as Thomy French-style mayonnaise, 10.5 kg. Bucket versus generic package remains unresolved.'
    SourceUrl = 'https://www-static.transgourmet.ch/public/2024-03/kw14-bgh-guide-april-d.pdf'
  }
  '411170' = @{
    Values = @{ name = 'Natura Bio Langkornreis Parboiled, 5 kg'; salesUnit = 'bag' }
    ResolvedFields = @('name', 'salesUnit')
    Note = 'Official product page identifies the full name and a 5 kg bag.'
    SourceUrl = 'https://web.transgourmet.ch/de/prodega-easy/catalog/article/411170'
  }
  '626960' = @{
    Values = @{ name = 'Aquina ohne CO2, Pack zu 24 Fl. x 50 cl'; packSizeValue = '500'; packSizeUnit = 'ml'; unitsPerSalesUnit = '24' }
    ResolvedFields = @('name', 'packSizeValue', 'packSizeUnit')
    Note = 'Official catalogue identifies 24 x 50 cl; 12 l seed total and 500 ml x 24 normalized pack are equivalent.'
    SourceUrl = 'https://web.transgourmet.ch/de/prodega-easy/catalog/article/626960'
  }
  '626970' = @{
    Values = @{ name = 'Aquina mit CO2, Pack zu 24 Fl. x 50 cl'; packSizeValue = '500'; packSizeUnit = 'ml'; unitsPerSalesUnit = '24' }
    ResolvedFields = @('name', 'packSizeValue', 'packSizeUnit')
    Note = 'Official catalogue identifies 24 x 50 cl; 12 l seed total and 500 ml x 24 normalized pack are equivalent.'
    SourceUrl = 'https://web.transgourmet.ch/de/prodega-easy/catalog?cHwgId=5'
  }
  '682970' = @{
    Values = @{ name = 'Coca-Cola Zero 4 x 6 x 33 cl'; packSizeValue = '330'; packSizeUnit = 'ml'; unitsPerSalesUnit = '24' }
    ResolvedFields = @('name', 'packSizeValue', 'packSizeUnit')
    Note = 'Official product page identifies 4 x 6 x 33 cl; 7.92 l seed total and 330 ml x 24 normalized pack are equivalent.'
    SourceUrl = 'https://web.transgourmet.ch/de/prodega-easy/catalog/article/682970'
  }
}

$canonicalRows = foreach ($articleNumber in $allArticleNumbers) {
  $seed = $seedByArticle[$articleNumber]
  $scraped = $scrapedByArticle[$articleNumber]
  $hasSeed = $null -ne $seed
  $hasScraped = $null -ne $scraped
  $provenance = if ($hasSeed -and $hasScraped) { 'merged' } elseif ($hasScraped) { 'scraped' } else { 'seed' }

  $conflictFields = [Collections.Generic.List[string]]::new()
  if ($hasSeed -and $hasScraped) {
    if (Values-Conflict $seed.name $scraped.name) { $conflictFields.Add('name') }
    if (Values-Conflict $seed.packSizeValue $scraped.packSizeValue -Numeric) { $conflictFields.Add('packSizeValue') }
    if (Values-Conflict $seed.packSizeUnit $scraped.packSizeUnit) { $conflictFields.Add('packSizeUnit') }
    if (Values-Conflict $seed.salesUnit $scraped.salesUnit) { $conflictFields.Add('salesUnit') }
    if (Values-Conflict $seed.unitsPerSalesUnit $scraped.unitsPerSalesUnit -Numeric) { $conflictFields.Add('unitsPerSalesUnit') }
  }
  $resolution = $officialResolutions[$articleNumber]
  if ($null -ne $resolution -and $articleNumber -in @('042592', '152501')) {
    # These verified names contain non-ASCII characters. Read them from the
    # explicitly UTF-8 source data instead of embedding them in this PS 5 script.
    $resolution.Values.name = [string]$seed.name
  }
  if ($null -ne $resolution) {
    foreach ($resolvedField in $resolution.ResolvedFields) {
      [void]$conflictFields.Remove([string]$resolvedField)
    }
  }
  $nameConflict = $conflictFields.Contains('name')
  $packConflict = @($conflictFields | Where-Object { $_ -ne 'name' }).Count -gt 0
  $conflictDetails = if ($nameConflict -or $packConflict) {
    $details = [Collections.Generic.List[string]]::new()
    if ($nameConflict) { $details.Add("name seed=[$($seed.name)] scraped=[$($scraped.name)]") }
    if ($packConflict) { $details.Add("pack seed=[$(Pack-Summary $seed)] scraped=[$(Pack-Summary $scraped)]") }
    $details -join ' | '
  } else { '' }

  $scrapedPriceIsVerified = $hasScraped -and (Has-Value $scraped.priceCHF) -and $scraped.verificationStatus -eq 'verified_public_source'
  if ($scrapedPriceIsVerified) {
    $priceCHF = [string]$scraped.priceCHF
    $priceBasis = Prefer-Value $scraped.priceBasis $seed.priceBasis
    $priceProvenance = 'scraped'
  } elseif ($hasSeed -and (Has-Value $seed.priceCHF)) {
    $priceCHF = [string]$seed.priceCHF
    $priceBasis = Prefer-Value $seed.priceBasis $scraped.priceBasis
    $priceProvenance = 'seed'
  } elseif ($hasScraped -and (Has-Value $scraped.priceCHF)) {
    $priceCHF = [string]$scraped.priceCHF
    $priceBasis = Prefer-Value $scraped.priceBasis $seed.priceBasis
    $priceProvenance = 'scraped'
  } else {
    $priceCHF = ''
    $priceBasis = ''
    $priceProvenance = ''
  }

  [pscustomobject][ordered]@{
    articleNumber = $articleNumber
    name = if ($null -ne $resolution -and $resolution.Values.ContainsKey('name')) { $resolution.Values.name } else { Prefer-Value $scraped.name $seed.name }
    brand = Prefer-Value $scraped.brand $seed.brand
    category = Prefer-Value $scraped.category $seed.category
    subcategory = Prefer-Value $scraped.subcategory $seed.subcategory
    packSizeValue = if ($null -ne $resolution -and $resolution.Values.ContainsKey('packSizeValue')) { $resolution.Values.packSizeValue } else { Prefer-Value $scraped.packSizeValue $seed.packSizeValue }
    packSizeUnit = if ($null -ne $resolution -and $resolution.Values.ContainsKey('packSizeUnit')) { $resolution.Values.packSizeUnit } else { Prefer-Value $scraped.packSizeUnit $seed.packSizeUnit }
    salesUnit = if ($null -ne $resolution -and $resolution.Values.ContainsKey('salesUnit')) { $resolution.Values.salesUnit } else { Prefer-Value $scraped.salesUnit $seed.salesUnit }
    unitsPerSalesUnit = if ($null -ne $resolution -and $resolution.Values.ContainsKey('unitsPerSalesUnit')) { $resolution.Values.unitsPerSalesUnit } else { Prefer-Value $scraped.unitsPerSalesUnit $seed.unitsPerSalesUnit }
    ingredients = Prefer-Value $scraped.ingredients $seed.ingredients
    dietaryTags = Prefer-Value $scraped.dietaryTags $seed.dietaryTags
    allergens = Prefer-Value $scraped.allergens $seed.allergens
    origin = Prefer-Value $scraped.origin $seed.origin
    priceCHF = $priceCHF
    priceBasis = $priceBasis
    sourceUrl = Prefer-Value $scraped.sourceUrl $seed.sourceUrl
    verifiedAt = Prefer-Value $scraped.verifiedAt $seed.verifiedAt
    verificationStatus = Prefer-Value $scraped.verificationStatus $seed.verificationStatus
    notes = Prefer-Value $scraped.notes $seed.notes
    provenance = $provenance
    identityProvenance = if (Uses-SeedFallback $seed $scraped @('name','brand','category','subcategory')) { 'merged' } elseif ($hasScraped) { 'scraped' } else { 'seed' }
    packProvenance = if (Uses-SeedFallback $seed $scraped @('packSizeValue','packSizeUnit','salesUnit','unitsPerSalesUnit')) { 'merged' } elseif ($hasScraped) { 'scraped' } else { 'seed' }
    priceProvenance = $priceProvenance
    nameConflict = $nameConflict.ToString().ToLowerInvariant()
    packConflict = $packConflict.ToString().ToLowerInvariant()
    conflictFields = $conflictFields -join ';'
    conflictDetails = $conflictDetails
    conflictResolution = if ($null -ne $resolution) { $resolution.Note } else { '' }
    resolutionSourceUrl = if ($null -ne $resolution) { $resolution.SourceUrl } else { '' }
  }
}

$canonicalRows | Export-Csv -Path $OutputPath -Encoding UTF8 -NoTypeInformation

$validatedRows = @(Import-Csv -Encoding UTF8 $OutputPath)
if ($validatedRows.Count -ne $allArticleNumbers.Count) { throw 'Canonical row count does not match the unique article union.' }
if (@($validatedRows | Group-Object articleNumber | Where-Object Count -ne 1).Count -ne 0) { throw 'Canonical articleNumber values are not unique.' }
if (@($validatedRows | Where-Object { -not (Has-Value $_.articleNumber) -or -not (Has-Value $_.name) }).Count -ne 0) { throw 'Canonical dataset contains a blank articleNumber or name.' }
if (@($validatedRows | Where-Object { (Has-Value $_.priceCHF) -and -not (Is-ValidPrice $_.priceCHF) }).Count -ne 0) { throw 'Canonical dataset contains an invalid price.' }
if (@($validatedRows | Where-Object { $_.provenance -notin @('seed','scraped','merged') }).Count -ne 0) { throw 'Canonical dataset contains invalid provenance.' }

$canonicalByArticle = @{}
foreach ($row in $validatedRows) { $canonicalByArticle[$row.articleNumber] = $row }
$preferredMetadataFields = @(
  'name','brand','category','subcategory','packSizeValue','packSizeUnit','salesUnit',
  'unitsPerSalesUnit','ingredients','dietaryTags','allergens','origin','sourceUrl',
  'verifiedAt','verificationStatus','notes'
)
foreach ($articleNumber in $allArticleNumbers) {
  $canonical = $canonicalByArticle[$articleNumber]
  $seed = $seedByArticle[$articleNumber]
  $scraped = $scrapedByArticle[$articleNumber]
  foreach ($field in $preferredMetadataFields) {
    $resolution = $officialResolutions[$articleNumber]
    $expected = if ($null -ne $resolution -and $resolution.Values.ContainsKey($field)) {
      [string]$resolution.Values[$field]
    } else {
      Prefer-Value $scraped.$field $seed.$field
    }
    if ([string]$canonical.$field -ne $expected) {
      throw "Canonical field preference failed for article $articleNumber field $field."
    }
    if (((Has-Value $scraped.$field) -or (Has-Value $seed.$field)) -and -not (Has-Value $canonical.$field)) {
      throw "Canonical merge replaced a populated field with blank for article $articleNumber field $field."
    }
  }
  if (($canonical.nameConflict -eq 'true' -or $canonical.packConflict -eq 'true') -and -not (Has-Value $canonical.conflictDetails)) {
    throw "Canonical conflict lacks details for article $articleNumber."
  }
}

$overlapCount = @($allArticleNumbers | Where-Object { $seedByArticle.ContainsKey($_) -and $scrapedByArticle.ContainsKey($_) }).Count
$officialStatuses = @('verified_public_source', 'official_product_verified_price_unverified')
$report = [ordered]@{
  totalUniqueProducts = $validatedRows.Count
  overlapCount = $overlapCount
  productsWithPrices = @($validatedRows | Where-Object { Has-Value $_.priceCHF }).Count
  officiallyVerifiedProducts = @($validatedRows | Where-Object { $_.verificationStatus -in $officialStatuses }).Count
  conflicts = @($validatedRows | Where-Object { $_.nameConflict -eq 'true' -or $_.packConflict -eq 'true' }).Count
  nameConflicts = @($validatedRows | Where-Object nameConflict -eq 'true').Count
  packConflicts = @($validatedRows | Where-Object packConflict -eq 'true').Count
  categoryCounts = [ordered]@{}
}
foreach ($group in ($validatedRows | Group-Object category | Sort-Object Name)) {
  $report.categoryCounts[$group.Name] = $group.Count
}

$report | ConvertTo-Json -Depth 4
