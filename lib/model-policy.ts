export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4.1-nano";
const LOW_COST_MODELS = new Set([
  DEFAULT_OPENROUTER_MODEL,
  "qwen/qwen3.8-flash",
]);
export function lowCostModelConfig(requested?: string) {
  const model =
    requested && LOW_COST_MODELS.has(requested)
      ? requested
      : DEFAULT_OPENROUTER_MODEL;
  return {
    model,
    ...(model === "qwen/qwen3.8-flash"
      ? { reasoning: { enabled: false } }
      : {}),
    provider: {
      sort: "price",
      require_parameters: true,
      max_price: { prompt: 0.15, completion: 0.6 },
    },
  };
}
