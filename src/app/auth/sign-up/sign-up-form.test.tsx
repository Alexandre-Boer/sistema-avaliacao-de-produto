import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignUpForm } from "@/app/auth/sign-up/sign-up-form";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const fetchMock = vi.fn();

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SignUpForm />
    </QueryClientProvider>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nome"), "Ana");
  await user.type(screen.getByLabelText("Sobrenome"), "Silva");
  await user.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");
  await user.type(screen.getByLabelText("Senha"), "senha-forte-123");
  await user.type(
    screen.getByLabelText("Confirmação de senha"),
    "senha-forte-123",
  );
}

beforeEach(() => {
  pushMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SignUpForm", () => {
  it("renderiza os cinco campos e o botão de envio", () => {
    renderForm();
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByLabelText("Sobrenome")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmação de senha")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Criar conta" }),
    ).toBeInTheDocument();
  });

  it("mostra erros de validação ao submeter vazio e não chama a API", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText("Informe seu nome")).toBeInTheDocument();
    expect(screen.getByText("Informe seu sobrenome")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envia os dados e navega para /auth/sign-up/success no 201", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: "abc123" }),
    });
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/sign-up",
      expect.objectContaining({ method: "POST" }),
    );
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sentBody.email).toBe("ana@exemplo.com");
    expect(pushMock).toHaveBeenCalledWith("/auth/sign-up/success");
  });

  it("exibe alert vermelho com a mensagem da API no erro (409)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "E-mail já cadastrado" }),
    });
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("E-mail já cadastrado");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("mantém o botão desabilitado depois do 201, até a navegação acontecer", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: "abc123" }),
    });
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalled());
    expect(
      screen.getByRole("button", { name: "Criando conta…" }),
    ).toBeDisabled();
  });

  it("mostra mensagem em português quando a rede falha, e não o texto do navegador", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

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
    const password = screen.getByLabelText("Senha");
    expect(screen.getByLabelText("Nome")).not.toHaveAttribute(
      "aria-describedby",
    );
    // Sem erro, a senha é descrita pela dica de tamanho.
    expect(password).toHaveAccessibleDescription("Pelo menos 8 caracteres.");

    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    await screen.findByText("Informe seu nome");
    expect(screen.getByLabelText("Nome")).toHaveAccessibleDescription(
      "Informe seu nome",
    );
    expect(screen.getByLabelText("Sobrenome")).toHaveAccessibleDescription(
      "Informe seu sobrenome",
    );
    for (const label of ["E-mail", "Senha"]) {
      const field = screen.getByLabelText(label);
      const describedBy = field.getAttribute("aria-describedby") ?? "";
      const description = document.getElementById(describedBy);
      expect(description).toHaveAttribute("data-slot", "field-error");
      expect(description).not.toBeEmptyDOMElement();
    }
  });

  it("liga a confirmação de senha ao erro de senhas diferentes", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    const confirmation = screen.getByLabelText("Confirmação de senha");
    await user.type(confirmation, "-diferente");
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() =>
      expect(confirmation).toHaveAttribute("aria-invalid", "true"),
    );
    const description = document.getElementById(
      confirmation.getAttribute("aria-describedby") ?? "",
    );
    expect(description).toHaveAttribute("data-slot", "field-error");
    expect(description).not.toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("o botão de mostrar/ocultar senha troca o rótulo e não usa aria-pressed", async () => {
    const user = userEvent.setup();
    renderForm();
    const toggle = screen.getByRole("button", { name: "Mostrar senha" });
    expect(toggle).not.toHaveAttribute("aria-pressed");

    await user.click(toggle);

    expect(toggle).toHaveAccessibleName("Ocultar senha");
    expect(toggle).not.toHaveAttribute("aria-pressed");
  });
});
