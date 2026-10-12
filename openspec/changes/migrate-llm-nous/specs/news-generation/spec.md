## REMOVED Requirements

### Requirement: OpenRouter inference
**Reason**: The owner disabled OpenRouter for the project (issue #229).
**Migration**: Provider selection moves to the `model-provider` capability (Nous-only channel inference).

### Requirement: Default DeepSeek model
**Reason**: DeepSeek V3.2 was an OpenRouter default; the project now defaults to `openai/gpt-6.1-sol` on Nous Portal.
**Migration**: See `model-provider` (Default model). `PIZDATO_LLM_MODEL` is no longer read; use `PIZDATO_NEWS_MODEL`.
