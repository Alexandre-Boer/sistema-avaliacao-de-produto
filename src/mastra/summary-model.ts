/** Modelo usado quando `AI_SUMMARY_MODEL` não está definido. */
export const DEFAULT_SUMMARY_MODEL = "openai/gpt-4o-mini";

/** Variável da chave de cada provedor do roteador de modelos do Mastra. */
const PROVIDER_KEY_VARIABLES: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

/** O que o `Agent` do Mastra aceita em `model`: um id ou um endpoint próprio. */
export type SummaryModel =
  | string
  | { id: `${string}/${string}`; url: string; apiKey?: string };

export type SummaryModelConfig = {
  model: SummaryModel;
  /** Id do modelo, gravado junto com o resumo. */
  label: string;
};

type Env = Record<string, string | undefined>;

/**
 * Decide qual modelo gera os resumos, a partir das variáveis de ambiente:
 *
 * - `AI_SUMMARY_MODEL`: id no formato `provedor/modelo` (padrão `openai/gpt-4o-mini`);
 * - `AI_SUMMARY_BASE_URL`: endereço de uma API compatível com a da OpenAI, como
 *   o Ollama local (`http://localhost:11434/v1`). Com ela o modelo é chamado
 *   nesse endereço e nenhuma chave é exigida;
 * - `AI_SUMMARY_API_KEY`: chave opcional para esse endereço próprio.
 *
 * Sem endereço próprio, o provedor precisa da chave dele (`OPENAI_API_KEY`,
 * `ANTHROPIC_API_KEY`...). Devolve `null` quando ela falta: a aplicação segue
 * funcionando, só sem o resumo.
 */
export function resolveSummaryModel(
  env: Env = process.env,
): SummaryModelConfig | null {
  const id = env.AI_SUMMARY_MODEL?.trim() || DEFAULT_SUMMARY_MODEL;
  if (!id.includes("/")) {
    return null;
  }

  const baseUrl = env.AI_SUMMARY_BASE_URL?.trim();
  if (baseUrl) {
    const apiKey = env.AI_SUMMARY_API_KEY?.trim();
    return {
      model: {
        id: id as `${string}/${string}`,
        url: baseUrl,
        ...(apiKey ? { apiKey } : {}),
      },
      label: id,
    };
  }

  const provider = id.slice(0, id.indexOf("/"));
  const keyVariable = PROVIDER_KEY_VARIABLES[provider];
  if (keyVariable && !env[keyVariable]?.trim()) {
    return null;
  }

  return { model: id, label: id };
}
