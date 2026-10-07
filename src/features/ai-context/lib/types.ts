export type ContextLayer = {
  label: string;
  detail: string;
  chars: number;
  trimmed?: boolean;
};

export type AiContext = { text: string; layers: ContextLayer[] };

export function estimateTokens(chars: number) {
  return Math.ceil(chars / 4);
}

export function contextTokens(context: AiContext) {
  return estimateTokens(context.layers.reduce((total, layer) => total + layer.chars, 0));
}

export function formatTokens(tokens: number) {
  if (tokens < 1000) return `about ${tokens} tokens`;
  return `about ${(tokens / 1000).toFixed(tokens < 10_000 ? 1 : 0)}k tokens`;
}
