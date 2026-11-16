import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackForm } from "@/components/feedback/feedback-form";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const fetchMock = vi.fn();

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FeedbackForm productId="p1" />
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText("4 estrelas"));
  await user.type(screen.getByLabelText("Comentário"), "Muito bom");
  await user.click(screen.getByRole("button", { name: "Enviar avaliação" }));
}

beforeEach(() => {
  refreshMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FeedbackForm", () => {
  it("mostra erros ao enviar sem nota e sem comentário, sem chamar a API", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Enviar avaliação" }));

    expect(
      await screen.findByText("Escolha uma nota de 1 a 5"),
    ).toBeInTheDocument();
    expect(screen.getByText("Escreva um comentário")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envia nota e comentário para /api/v1/products/p1/feedbacks e atualiza o router no 201", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: "f1" }),
    });
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/products/p1/feedbacks",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      score: 4,
      comment: "Muito bom",
    });
    expect(refreshMock).toHaveBeenCalled();
    // O formulário volta ao estado inicial depois do envio.
    expect(screen.getByLabelText("Comentário")).toHaveValue("");
    expect(screen.getByLabelText("4 estrelas")).not.toBeChecked();
  });

  it("no 401 mostra alert com link para entrar", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Faça login para avaliar" }),
    });
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Faça login para avaliar");
    expect(within(alert).getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("no 400 mostra a mensagem da API no alert", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Dados inválidos" }),
    });
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível enviar");
    expect(alert).toHaveTextContent("Dados inválidos");
    expect(
      within(alert).queryByRole("link", { name: "Entrar" }),
    ).not.toBeInTheDocument();
    // O que a pessoa escreveu é preservado para nova tentativa.
    expect(screen.getByLabelText("Comentário")).toHaveValue("Muito bom");
  });
});
