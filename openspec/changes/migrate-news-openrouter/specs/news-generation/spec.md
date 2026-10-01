## Purpose

Generate article-grounded Russian news verdicts and evening channel copy using OpenRouter, while retaining predictable local fallbacks when inference is unavailable.

## ADDED Requirements

### Requirement: OpenRouter inference
The news generator MUST use OpenRouter for LLM inference.

#### Scenario: Hourly inference without Cursor
- **GIVEN** an OpenRouter key is configured and the article text is supplied
- **WHEN** the hourly worker requests a verdict
- **THEN** it sends the request to OpenRouter without starting Cursor or requiring a Telegram session for inference

#### Scenario: Evening inference without Cursor
- **GIVEN** an OpenRouter key is configured
- **WHEN** the evening worker requests channel copy
- **THEN** it generates the copy using OpenRouter without starting Cursor

### Requirement: Default DeepSeek model
The news generator MUST select `deepseek/deepseek-v3.2` when no model override is configured.

#### Scenario: Default and override
- **WHEN** an inference request is made
- **THEN** the model is `deepseek/deepseek-v3.2` unless a nonempty `PIZDATO_LLM_MODEL` override is configured

### Requirement: Bounded inference
Each inference request MUST have a finite configurable deadline.

#### Scenario: Timeout
- **GIVEN** the provider does not finish before the configured deadline
- **WHEN** the deadline expires
- **THEN** the generator aborts inference and uses its existing local fallback

### Requirement: Article-grounded verdict
Hourly verdict generation MUST use the article body supplied by the news ingestion flow.

#### Scenario: Valid response
- **GIVEN** a fetched article body and a valid provider JSON response
- **WHEN** the worker generates a verdict
- **THEN** it returns the existing `pizdato` or `huyevo` verdict and a nonempty Russian reason for that article

#### Scenario: Article enrichment
- **GIVEN** the caller has not supplied an article body
- **WHEN** verdict generation begins
- **THEN** it uses the existing article-fetching behavior before requesting inference

#### Scenario: Unreachable article
- **GIVEN** the article body is absent and the existing article fetch fails
- **WHEN** verdict generation begins
- **THEN** it reports the existing article-fetch failure rather than producing a fallback verdict for persistence

### Requirement: Local failure fallbacks
The generator MUST retain the existing local heuristic verdict and evening template on inference failure.

#### Scenario: Unavailable inference
- **GIVEN** missing credentials, an HTTP/network/API error, timeout, empty response or output truncated by the token limit
- **WHEN** hourly or evening inference is requested
- **THEN** the respective existing local fallback is returned with a diagnostic note

#### Scenario: Invalid output
- **GIVEN** an unsupported verdict, empty reason, malformed JSON or invalid evening post structure
- **WHEN** provider output is validated
- **THEN** the respective existing local fallback is returned

### Requirement: Credential confidentiality
Generation diagnostics MUST exclude API keys and raw provider error bodies.

#### Scenario: Provider error with private details
- **GIVEN** a failed provider response containing private request details
- **WHEN** the worker records its failure
- **THEN** the diagnostic contains the error category or HTTP status without the provider response body or key

### Requirement: Cron compatibility
The provider migration MUST preserve the existing hourly worker's ingestion and persistence behavior.

#### Scenario: Successful hourly collection
- **WHEN** the hourly worker accepts a suitable unseen article
- **THEN** its existing transaction stores the news item and system vote without a success Telegram message

#### Scenario: No suitable article
- **WHEN** no suitable unseen article is found
- **THEN** the hourly worker exits successfully without a news insert or vote

#### Scenario: Worker failure
- **WHEN** the hourly worker fails during ingestion or persistence
- **THEN** it retains its existing owner notification and unsuccessful exit behavior
