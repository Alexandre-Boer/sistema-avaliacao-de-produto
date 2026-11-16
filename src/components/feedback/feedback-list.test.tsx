import { render, screen } from "@testing-library/react";
import { FeedbackList } from "@/components/feedback/feedback-list";
import type { Feedback, FeedbackListing } from "@/server/feedbacks/feedback";

let sequence = 0;

function f(score: number, firstName: string, lastName: string): Feedback {
  sequence += 1;
  return {
    id: `f${sequence}`,
    score,
    comment: `Comentário de ${firstName}`,
    createdAt: "2026-11-13T15:00:00Z",
    author: { firstName, lastName },
  };
}

/** Resumo coerente com a lista, como `listFeedbacks` devolve quando tudo cabe na página. */
function listing(
  feedbacks: Feedback[],
  overrides: Partial<FeedbackListing> = {},
): FeedbackListing {
  const distribution: FeedbackListing["distribution"] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const feedback of feedbacks) {
    distribution[feedback.score] += 1;
  }
  const sum = feedbacks.reduce((total, feedback) => total + feedback.score, 0);
  return {
    feedbacks,
    total: feedbacks.length,
    average: feedbacks.length > 0 ? sum / feedbacks.length : null,
    distribution,
    ...overrides,
  };
}

/** Preenchimento de cada uma das cinco estrelas da média (0 a 1). */
function averageStarFills(): string[] {
  const stars = screen.getByTestId("average-stars");
  return Array.from(stars.querySelectorAll("[data-fill]")).map(
    (star) => star.getAttribute("data-fill") ?? "",
  );
}

describe("FeedbackList", () => {
  it("mostra estado vazio sem avaliações", () => {
    render(<FeedbackList {...listing([])} />);

    expect(
      screen.getByRole("heading", { name: "Avaliações" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ainda não há avaliações. Seja a primeira pessoa a avaliar.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("lista avaliações com autor, nota e média", () => {
    render(
      <FeedbackList
        {...listing([f(5, "Ana", "Silva"), f(4, "Bia", "Souza")])}
      />,
    );

    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.getByText("Bia Souza")).toBeInTheDocument();
    expect(screen.getByText("Comentário de Ana")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Nota 5 de 5" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Nota 4 de 5" }),
    ).toBeInTheDocument();
    expect(screen.getByText("4,5")).toBeInTheDocument(); // média
    expect(screen.getByText("2 avaliações")).toBeInTheDocument();
    expect(screen.getAllByText("13 de nov. de 2026")).toHaveLength(2);
  });

  it("usa o singular com uma única avaliação", () => {
    render(<FeedbackList {...listing([f(4, "Ana", "Silva")])} />);

    expect(screen.getByText("1 avaliação")).toBeInTheDocument();
    expect(screen.getByText("4,0")).toBeInTheDocument();
  });

  it("as estrelas da média representam o mesmo valor do número (4,5 = quatro cheias e meia)", () => {
    render(
      <FeedbackList
        {...listing([f(5, "Ana", "Silva"), f(4, "Bia", "Souza")])}
      />,
    );

    expect(screen.getByText("4,5")).toBeInTheDocument();
    expect(averageStarFills()).toEqual(["1", "1", "1", "1", "0.5"]);
  });

  it("número e estrelas usam o mesmo arredondamento de uma casa (média 3,666… = 3,7)", () => {
    render(
      <FeedbackList
        {...listing([
          f(5, "Ana", "Silva"),
          f(4, "Bia", "Souza"),
          f(2, "Caio", "Lima"),
        ])}
      />,
    );

    expect(screen.getByText("3,7")).toBeInTheDocument();
    expect(averageStarFills()).toEqual(["1", "1", "1", "0.7", "0"]);
  });

  it("usa total, média e distribuição do banco, não das linhas listadas, e avisa que há mais", () => {
    render(
      <FeedbackList
        {...listing([f(5, "Ana", "Silva"), f(5, "Bia", "Souza")], {
          total: 1234,
          average: 2,
          distribution: { 5: 100, 4: 100, 3: 100, 2: 134, 1: 800 },
        })}
      />,
    );

    expect(screen.getByText("1.234 avaliações")).toBeInTheDocument();
    expect(screen.getByText("2,0")).toBeInTheDocument();
    expect(screen.getByText("800")).toBeInTheDocument();
    expect(screen.getByText("134")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(
      screen.getByText("Mostrando as 2 avaliações mais recentes de 1.234."),
    ).toBeInTheDocument();
  });

  it("não mostra o aviso de avaliações mais recentes quando todas estão na lista", () => {
    render(<FeedbackList {...listing([f(4, "Ana", "Silva")])} />);

    expect(screen.queryByText(/mais recentes/)).not.toBeInTheDocument();
  });

  it("usa o primeiro caractere completo do nome na inicial (emoji não é cortado ao meio)", () => {
    const emoji = String.fromCodePoint(0x1f600);
    // Mulher + ZWJ + computador: três code points, um único caractere visível.
    const composed = String.fromCodePoint(0x1f469, 0x200d, 0x1f4bb);
    render(
      <FeedbackList
        {...listing([f(5, `${emoji}Ana`, "silva"), f(4, "Bia", composed)])}
      />,
    );

    expect(screen.getByText(`${emoji}S`)).toBeInTheDocument();
    expect(screen.getByText(`B${composed}`)).toBeInTheDocument();
  });
});
