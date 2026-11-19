import {
  DEFAULT_SUMMARY_MODEL,
  resolveSummaryModel,
} from "@/mastra/summary-model";

describe("resolveSummaryModel", () => {
  it("usa o modelo padrão da OpenAI quando há chave", () => {
    expect(resolveSummaryModel({ OPENAI_API_KEY: "sk-teste" })).toEqual({
      model: DEFAULT_SUMMARY_MODEL,
      label: DEFAULT_SUMMARY_MODEL,
    });
  });

  it("devolve null quando falta a chave do provedor", () => {
    expect(resolveSummaryModel({})).toBeNull();
    expect(resolveSummaryModel({ OPENAI_API_KEY: "  " })).toBeNull();
    expect(
      resolveSummaryModel({
        AI_SUMMARY_MODEL: "anthropic/claude-haiku-4-5",
        OPENAI_API_KEY: "sk-teste",
      }),
    ).toBeNull();
  });

  it("aceita outro provedor com a chave dele", () => {
    expect(
      resolveSummaryModel({
        AI_SUMMARY_MODEL: "anthropic/claude-haiku-4-5",
        ANTHROPIC_API_KEY: "sk-ant-teste",
      }),
    ).toEqual({
      model: "anthropic/claude-haiku-4-5",
      label: "anthropic/claude-haiku-4-5",
    });
  });

  it("com endereço próprio não exige chave (modelo local)", () => {
    expect(
      resolveSummaryModel({
        AI_SUMMARY_MODEL: "custom/gemma3:4b",
        AI_SUMMARY_BASE_URL: "http://localhost:11434/v1",
      }),
    ).toEqual({
      model: { id: "custom/gemma3:4b", url: "http://localhost:11434/v1" },
      label: "custom/gemma3:4b",
    });
  });

  it("repassa a chave opcional do endereço próprio", () => {
    expect(
      resolveSummaryModel({
        AI_SUMMARY_MODEL: "custom/modelo",
        AI_SUMMARY_BASE_URL: "https://exemplo.com/v1",
        AI_SUMMARY_API_KEY: "segredo",
      })?.model,
    ).toEqual({
      id: "custom/modelo",
      url: "https://exemplo.com/v1",
      apiKey: "segredo",
    });
  });

  it("devolve null para um id fora do formato provedor/modelo", () => {
    expect(
      resolveSummaryModel({
        AI_SUMMARY_MODEL: "gpt-4o-mini",
        OPENAI_API_KEY: "sk-teste",
      }),
    ).toBeNull();
  });
});
