const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export async function openRouterText({ system, prompt, temperature }) {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error("OPENROUTER_API_KEY missing");
  const configuredTimeout = Number(process.env.PIZDATO_LLM_TIMEOUT_MS || 60000);
  const timeout = Number.isSafeInteger(configuredTimeout) && configuredTimeout > 0 && configuredTimeout <= 2147483647
    ? configuredTimeout
    : 60000;
  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(timeout),
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://pizdato.net",
        "X-Title": "pizdato-channel",
      },
      body: JSON.stringify({
        model: process.env.PIZDATO_LLM_MODEL?.trim() || "deepseek/deepseek-v3.2",
        temperature,
        max_tokens: 4096,
        reasoning: { enabled: false },
        messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      }),
    });
  } catch (error) {
    throw new Error(error?.name === "TimeoutError" || error?.name === "AbortError"
      ? "OpenRouter request timed out"
      : "OpenRouter network request failed");
  }
  if (!response.ok) throw new Error(`OpenRouter HTTP ${response.status}`);
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("OpenRouter response could not be read as JSON");
  }
  if (data?.error) throw new Error("OpenRouter returned an API error");
  const choice = data?.choices?.[0];
  if (choice?.finish_reason === "length") throw new Error("OpenRouter response truncated");
  const content = choice?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenRouter returned an empty or invalid completion");
  }
  return content.trim();
}
