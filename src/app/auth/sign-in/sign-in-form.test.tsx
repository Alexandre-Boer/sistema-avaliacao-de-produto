import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInForm } from "@/app/auth/sign-in/sign-in-form";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const fetchMock = vi.fn();

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SignInForm />
    </QueryClientProvider>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");
  await user.type(screen.getByLabelText("Senha"), "senha-forte-123");
}

beforeEach(() => {
  pushMock.mockReset();
  refreshMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SignInForm", () => {
  it("renderiza e-mail, senha e o botão Entrar", () => {
    renderForm();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute(
      "href",
      "/auth/sign-up",
    );
  });

  it("mostra erros de validação ao submeter vazio e não chama a API", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(
      await screen.findByText("Informe um e-mail válido"),
    ).toBeInTheDocument();
    expect(screen.getByText("Informe sua senha")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envia os dados, navega para / e atualiza o router no 200", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: "acc_1" }),
    });
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/sign-in",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      email: "ana@exemplo.com",
      password: "senha-forte-123",
    });
    expect(pushMock).toHaveBeenCalledWith("/");
    expect(refreshMock).toHaveBeenCalledTimes(1);
    // O refresh precisa vir depois do push: é ele que faz o cabeçalho da home
    // reler o cookie recém-criado.
    expect(pushMock.mock.invocationCallOrder[0]).toBeLessThan(
      refreshMock.mock.invocationCallOrder[0],
    );
  });

  it("exibe alert vermelho com a mensagem genérica no 401", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "E-mail ou senha inválidos" }),
    });
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("E-mail ou senha inválidos");
    expect(pushMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("mantém o botão desabilitado depois do 200, até a navegação acontecer", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: "acc_1" }),
    });
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Entrando…" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Entrar" }),
    ).not.toBeInTheDocument();
  });

  it("reabilita o botão quando o login falha", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "E-mail ou senha inválidos" }),
    });
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("mostra a mensagem do 429 quando o limite de tentativas estoura", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        error: "Muitas tentativas de login. Tente de novo em 15 minutos.",
      }),
    });
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Muitas tentativas de login. Tente de novo em 15 minutos.",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("mostra mensagem em português quando a rede falha, e não o texto do navegador", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Não foi possível conectar. Verifique sua conexão e tente de novo.",
    );
    expect(alert).not.toHaveTextContent("Failed to fetch");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("liga cada campo inválido à sua mensagem de erro com aria-describedby", async () => {
    const user = userEvent.setup();
    renderForm();
    const email = screen.getByLabelText("E-mail");
    const password = screen.getByLabelText("Senha");
    expect(email).not.toHaveAttribute("aria-describedby");
    expect(password).not.toHaveAttribute("aria-describedby");

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await screen.findByText("Informe um e-mail válido");
    expect(email).toHaveAccessibleDescription("Informe um e-mail válido");
    expect(password).toHaveAccessibleDescription("Informe sua senha");
  });

  it("o botão de mostrar/ocultar senha troca o rótulo e não usa aria-pressed", async () => {
    const user = userEvent.setup();
    renderForm();
    const toggle = screen.getByRole("button", { name: "Mostrar senha" });
    expect(toggle).not.toHaveAttribute("aria-pressed");

    await user.click(toggle);

    expect(toggle).toHaveAccessibleName("Ocultar senha");
    expect(toggle).not.toHaveAttribute("aria-pressed");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
  });
});
