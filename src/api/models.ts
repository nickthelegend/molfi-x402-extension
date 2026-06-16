export type ModelEntry = {
  id: string;
  name: string;
  openrouter_id: string;
  usdc_cost: number;
  credit_cost: number;
  description: string;
};

export const FALLBACK_MODELS: ModelEntry[] = [
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B',
    openrouter_id: 'meta-llama/llama-3.3-70b-instruct',
    usdc_cost: 0.001,
    credit_cost: 1,
    description: 'High performance open-weights instruction model.',
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    openrouter_id: 'deepseek/deepseek-chat',
    usdc_cost: 0.002,
    credit_cost: 1,
    description: 'Mixture-of-Experts chat model from DeepSeek.',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    openrouter_id: 'google/gemini-2.5-flash',
    usdc_cost: 0.003,
    credit_cost: 2,
    description: 'Fast and lightweight multimodal model by Google.',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    openrouter_id: 'openai/gpt-4o-mini',
    usdc_cost: 0.005,
    credit_cost: 3,
    description: 'Fast and affordable helper model from OpenAI.',
  },
  {
    id: 'claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    openrouter_id: 'anthropic/claude-3.5-sonnet',
    usdc_cost: 0.01,
    credit_cost: 5,
    description: 'State-of-the-art intelligence from Anthropic.',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    openrouter_id: 'openai/gpt-4o',
    usdc_cost: 0.01,
    credit_cost: 5,
    description: 'OpenAI high-intelligence flagship model.',
  },
  {
    id: 'claude-opus-4.x',
    name: 'Claude Opus 3',
    openrouter_id: 'anthropic/claude-3-opus',
    usdc_cost: 0.03,
    credit_cost: 10,
    description: 'Anthropic master model for complex reasoning.',
  },
  {
    id: 'llama-nemotron-rerank-vl-1b-v2-free',
    name: 'Llama Nemotron Rerank VL 1B (Free)',
    openrouter_id: 'nvidia/llama-nemotron-rerank-vl-1b-v2:free',
    usdc_cost: 0.0001,
    credit_cost: 1,
    description: 'NVIDIA reranking model (free).',
  },
  {
    id: 'nex-n2-pro-free',
    name: 'Nex N2 Pro (Free)',
    openrouter_id: 'nex-agi/nex-n2-pro:free',
    usdc_cost: 0.0001,
    credit_cost: 1,
    description: 'NEX AGI Pro reasoning model (free).',
  },
  {
    id: 'riverflow-v2.5-pro',
    name: 'Riverflow v2.5 Pro',
    openrouter_id: 'sourceful/riverflow-v2.5-pro',
    usdc_cost: 0.0002,
    credit_cost: 1,
    description: 'Sourceful Riverflow Pro model.',
  },
  {
    id: 'riverflow-v2.5-fast',
    name: 'Riverflow v2.5 Fast',
    openrouter_id: 'sourceful/riverflow-v2.5-fast',
    usdc_cost: 0.0001,
    credit_cost: 1,
    description: 'Sourceful Riverflow Fast model.',
  },
  {
    id: 'nemotron-3.5-content-safety-free',
    name: 'Nemotron 3.5 Content Safety (Free)',
    openrouter_id: 'nvidia/nemotron-3.5-content-safety:free',
    usdc_cost: 0.0001,
    credit_cost: 1,
    description: 'NVIDIA content safety guardrail (free).',
  },
  {
    id: 'nemotron-3-ultra-550b-a55b-free',
    name: 'Nemotron 3 Ultra 550B (Free)',
    openrouter_id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    usdc_cost: 0.0002,
    credit_cost: 1,
    description: 'NVIDIA flagship Nemotron Ultra (free).',
  },
];

export async function fetchModels(client: import("./client").ApiClient): Promise<ModelEntry[]> {
  try {
    const res = await client.fetch("/v1/models");
    if (!res.ok) throw new Error(`models fetch failed: ${res.status}`);
    const raw = (await res.json()) as any[];
    return raw.map(m => ({
      id: m.id,
      name: m.name,
      openrouter_id: m.openRouterId || m.openrouter_id,
      usdc_cost: m.usdcCost !== undefined ? m.usdcCost : m.usdc_cost,
      credit_cost: m.creditCost !== undefined ? m.creditCost : m.credit_cost,
      description: m.description,
    }));
  } catch (err) {
    console.error("Failed to fetch models from backend, using fallback:", err);
    return FALLBACK_MODELS;
  }
}
