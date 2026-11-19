import { render, screen } from "@testing-library/react";
import { AiSummary, AiSummarySkeleton } from "@/components/products/ai-summary";

describe("AiSummary", () => {
  it("mostra o título, o selo de IA, o resumo e o aviso", () => {
    render(<AiSummary summary="As pessoas elogiam o som." />);

    const section = screen.getByRole("region", { name: "Resumo da IA" });
    expect(section).toHaveTextContent("As pessoas elogiam o som.");
    expect(screen.getByText("IA")).toBeInTheDocument();
    expect(
      screen.getByText(/Gerado por inteligência artificial/),
    ).toHaveTextContent("Pode conter imprecisões.");
  });

  it("renderiza HTML do resumo como texto, não como marcação", () => {
    const { container } = render(
      <AiSummary summary={'<img src=x onerror="alert(1)"> ótimo'} />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument();
  });
});

describe("AiSummarySkeleton", () => {
  it("avisa leitores de tela de que o resumo está carregando", () => {
    render(<AiSummarySkeleton />);
    expect(screen.getByText("Carregando o resumo da IA…")).toBeInTheDocument();
  });
});
