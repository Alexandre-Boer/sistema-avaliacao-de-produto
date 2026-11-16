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
      <FeedbackForm productId="p1" authorName="Ana Silva" />
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText("4 estrelas"));
  await user.type(screen.getByLabelText("Comentário"), "Muito bom");
  await user.click(screen.getByRole("button", { name: "Enviar avaliação" }));
}

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
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
  it("mostra quem está avaliando", () => {
    renderForm();

    expect(
      screen.getByText("Você está avaliando como Ana Silva."),
    ).toBeInTheDocument();
  });

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

  it("anuncia o grupo de estrelas como inválido e liga a mensagem de erro ao grupo e aos rádios", async () => {
    const user = userEvent.setup();
    renderForm();

    const group = screen.getByRole("radiogroup", { name: "Nota" });
    expect(group).not.toHaveAttribute("aria-invalid");
    expect(group).not.toHaveAttribute("aria-describedby");
    // `aria-invalid` não é suportado em `fieldset` (role `group`).
    expect(document.querySelector("fieldset[aria-invalid]")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Enviar avaliação" }));
    await screen.findByText("Escolha uma nota de 1 a 5");

    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAccessibleDescription("Escolha uma nota de 1 a 5");
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(5);
    for (const radio of radios) {
      expect(radio).toHaveAttribute("aria-invalid", "true");
      expect(radio).toHaveAccessibleDescription("Escolha uma nota de 1 a 5");
    }

    // Escolhida a nota, o grupo deixa de ser inválido.
    await user.click(screen.getByLabelText("3 estrelas"));
    expect(group).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("3 estrelas")).not.toHaveAttribute(
      "aria-invalid",
    );
  });

  it("liga a mensagem de erro do comentário ao campo", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Enviar avaliação" }));
    await screen.findByText("Escreva um comentário");

    expect(screen.getByLabelText("Comentário")).toHaveAccessibleDescription(
      expect.stringContaining("Escreva um comentário"),
    );
  });

  it("envia nota e comentário para /api/v1/products/p1/feedbacks e atualiza o router no 201", async () => {
    respond(201, { id: "f1" });
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
  });

  it("depois do 201 troca o formulário pela confirmação: sucesso e erros de validação nunca convivem", async () => {
    respond(201, { id: "f1" });
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Avaliação enviada.",
    );
    // Sem formulário não há como reenviar vazio e ver erros ao lado do sucesso.
    expect(
      screen.queryByRole("button", { name: "Enviar avaliação" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Comentário")).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("no 409 mostra o aviso de produto já avaliado no lugar do formulário e atualiza a página", async () => {
    respond(409, { error: "Você já avaliou este produto" });
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Você já avaliou este produto.",
    );
    expect(
      screen.queryByRole("button", { name: "Enviar avaliação" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // A avaliação feita em outra aba entra na lista.
    expect(refreshMock).toHaveBeenCalled();
  });

  it("no 401 mostra alert com link para entrar", async () => {
    respond(401, { error: "Faça login para avaliar" });
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

  it("no 401 de conta removida mostra o mesmo aviso de sessão expirada com link para entrar", async () => {
    respond(401, {
      error: "Sua sessão expirou. Entre novamente para avaliar.",
    });
    const user = userEvent.setup();
    renderForm();

    await fillAndSubmit(user);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Sua sessão expirou. Entre novamente para avaliar.",
    );
    expect(within(alert).getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
  });

  it("no 400 mostra a mensagem da API no alert", async () => {
    respond(400, { error: "Dados inválidos" });
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
