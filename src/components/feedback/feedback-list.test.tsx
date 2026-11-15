import { render, screen } from "@testing-library/react";
import { FeedbackList } from "@/components/feedback/feedback-list";
import type { Feedback } from "@/server/feedbacks/feedback";

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

describe("FeedbackList", () => {
  it("mostra estado vazio sem avaliações", () => {
    render(<FeedbackList feedbacks={[]} />);

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
      <FeedbackList feedbacks={[f(5, "Ana", "Silva"), f(4, "Bia", "Souza")]} />,
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
    render(<FeedbackList feedbacks={[f(4, "Ana", "Silva")]} />);

    expect(screen.getByText("1 avaliação")).toBeInTheDocument();
    expect(screen.getByText("4,0")).toBeInTheDocument();
  });
});
