## ADDED Requirements

### Requirement: Nous-only channel inference
The channel generators (`generateVerdict`, `generatePost`) MUST send model requests only to `https://inference-api.nousresearch.com/v1/chat/completions`, authenticated with `NOUS_API_KEY`, and MUST NOT offer an endpoint override.

#### Scenario: Hourly verdict
- **GIVEN** `NOUS_API_KEY` is configured and an article body is supplied
- **WHEN** the hourly worker requests a verdict
- **THEN** exactly one model request goes to the Nous Portal endpoint with that key and the article text, and the existing verdict/reason shape is returned

#### Scenario: Missing Nous key
- **GIVEN** `NOUS_API_KEY` is not configured
- **WHEN** a verdict or evening post is requested
- **THEN** no model request is sent and the existing heuristic verdict or template is returned with a diagnostic naming `NOUS_API_KEY`

#### Scenario: Provider failures
- **GIVEN** the Nous request times out, returns a non-2xx status, an embedded API error, an empty completion or `finish_reason: length`
- **WHEN** a verdict is requested
- **THEN** the existing heuristic fallback is returned with a diagnostic that names the failure category and contains neither the key nor the response body

### Requirement: No OpenRouter use
Runtimes in this repository MUST NOT read `OPENROUTER_API_KEY` and MUST NOT send requests to openrouter.ai.

#### Scenario: Only an OpenRouter key in the channel
- **GIVEN** `OPENROUTER_API_KEY` is set and `NOUS_API_KEY` is not
- **WHEN** a channel verdict is requested
- **THEN** no model request is sent and the heuristic fallback names `NOUS_API_KEY`

#### Scenario: Only an OpenRouter key in the agent
- **GIVEN** `OPENROUTER_API_KEY` is set and neither `NOUS_API_KEY` nor `PIZDATO_LLM_API_KEY` is
- **WHEN** the evening or morning `--check` runs
- **THEN** no model request is sent and the process exits unsuccessfully

### Requirement: Default model
Model requests MUST use `openai/gpt-6.1-sol` unless a role-specific override is configured.

#### Scenario: Channel default and override
- **WHEN** a channel model request is made
- **THEN** the model is `openai/gpt-6.1-sol` unless `PIZDATO_NEWS_MODEL` is set to a non-blank value, and `PIZDATO_LLM_MODEL` is ignored

#### Scenario: Agent default
- **GIVEN** neither `PIZDATO_EVENING_MODEL` nor `PIZDATO_MORNING_MODEL` is configured
- **WHEN** the evening or morning runtime, or the editorial evaluation, makes a model request without an explicit model
- **THEN** the model is `openai/gpt-6.1-sol`

### Requirement: Request shape
Requests MUST use the OpenAI-compatible shape with `max_completion_tokens`. Reasoning models (`gpt-5`–`gpt-9` and `o<N>`, with or without a vendor prefix) MUST receive `reasoning_effort` and no `temperature`; other models MUST receive `temperature` and no `reasoning_effort`. Requests MUST NOT carry the OpenRouter-only fields `reasoning`, `provider` and `max_tokens`, or the headers `HTTP-Referer` and `X-Title`.

#### Scenario: Channel reasoning model
- **WHEN** a verdict is requested with `openai/gpt-6.1-sol`
- **THEN** the body has `reasoning_effort: "low"` (fixed for the channel), `max_completion_tokens` and no `temperature`

#### Scenario: Channel non-reasoning override
- **GIVEN** `PIZDATO_NEWS_MODEL` names a non-reasoning model
- **WHEN** a verdict is requested
- **THEN** the body carries the verdict temperature and no `reasoning_effort`

#### Scenario: Model classification table
- **WHEN** the model is `openai/gpt-6.1-sol`, `gpt-5`, `openai/o3`; or `gpt-4o`, `gpt-10`, `mistralai/mistral-large-4-0`
- **THEN** the first three are treated as reasoning models and the last three are not

#### Scenario: Agent ignores OpenRouter-only options
- **GIVEN** the editorial gate passes `reasoning: {enabled: false}` in its request options
- **WHEN** the agent transport sends the request
- **THEN** the body has no `reasoning`, `provider` or `max_tokens` field, a reasoning model receives the effort selected by its title (`PIZDATO_EDITOR_REASONING_EFFORT` for reviewers, `PIZDATO_REASONING_EFFORT` otherwise, default `low`), and a non-reasoning model receives no effort

### Requirement: Nous default endpoint
The agent transport MUST default to `https://inference-api.nousresearch.com/v1`, MUST require HTTPS, and MUST bind `NOUS_API_KEY` to hosts matching `(^|\.)nousresearch\.com$` only. `PIZDATO_LLM_API_KEY`, when set, MUST take precedence for any allowed host.

#### Scenario: No endpoint configured
- **GIVEN** `PIZDATO_LLM_BASE_URL` is unset and `NOUS_API_KEY` is set
- **WHEN** the evening agent makes a model request
- **THEN** it goes to `https://inference-api.nousresearch.com/v1/chat/completions` with the Nous key

#### Scenario: Explicit key precedence
- **GIVEN** both `PIZDATO_LLM_API_KEY` and `NOUS_API_KEY` are set
- **WHEN** the configuration is read for the Nous host
- **THEN** `PIZDATO_LLM_API_KEY` is selected

#### Scenario: Other or look-alike host
- **GIVEN** `PIZDATO_LLM_BASE_URL` is another HTTPS host (including `evilnousresearch.com`) and only `NOUS_API_KEY` is set
- **WHEN** the configuration is read
- **THEN** no key is selected and the preflight fails before any request

#### Scenario: Plain HTTP
- **GIVEN** `PIZDATO_LLM_BASE_URL` uses `http://`
- **WHEN** the configuration is read
- **THEN** it throws before any request

### Requirement: OpenRouter endpoint rejected
The agent transport MUST refuse a base URL whose host is openrouter.ai or a subdomain of it, including a trailing-dot form.

#### Scenario: OpenRouter configured
- **GIVEN** `PIZDATO_LLM_BASE_URL` is `https://openrouter.ai/api/v1`, `https://eu.openrouter.ai/api/v1` or `https://openrouter.ai./api/v1`
- **WHEN** the configuration is read
- **THEN** it throws before any request, even when `PIZDATO_LLM_API_KEY` is set

### Requirement: Editorial equivalence
The provider change MUST NOT change what the editorial gate sends or decides.

#### Scenario: Gate goldens
- **WHEN** the golden gate cases run
- **THEN** their messages, options, results, records and snapshots match the pinned da0b2ed goldens unchanged

#### Scenario: Preflight against the baseline
- **WHEN** the preflight runs against the faked HTTP boundary
- **THEN** each request matches the da0b2ed preflight golden in order, model, messages, temperature, response format and tools, its `max_completion_tokens` equals the golden's `max_tokens`, its URL is the Nous Portal URL, and it carries no OpenRouter-only field or header

### Requirement: Deployment without OpenRouter
The deployed configuration MUST NOT contain an OpenRouter key or the DeepSeek model setting after migration.

#### Scenario: After deployment
- **WHEN** the migration is complete
- **THEN** `NOUS_API_KEY` exists only in `~/.config/pizdato-channel.env`, neither env file contains `OPENROUTER_API_KEY`, `PIZDATO_LLM_MODEL` or `PIZDATO_LLM_BASE_URL`, the checksum of `/etc/cron.d/pizdato-channel` is unchanged, evening and morning `--check` pass, and the next hourly run logs a Nous verdict and no OpenRouter call
