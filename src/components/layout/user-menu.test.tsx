import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserMenu } from "@/components/layout/user-menu";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const fetchMock = vi.fn();

const session = {
  accountId: "acc_1",
  firstName: "Ana",
  lastName: "Silva",
  email: "ana@exemplo.com",
};

const SIGN_OUT_ERROR =
  "Não foi possível sair. Verifique sua conexão e tente de novo.";

function trigger() {
  return screen.getByRole("button", { name: "Ana Silva" });
}

async function clickSignOut(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger());
  await user.click(await screen.findByRole("menuitem", { name: "Sair" }));
}

beforeEach(() => {
  refreshMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("UserMenu", () => {
  it("o gatilho tem o nome completo como nome acessível, uma única vez", () => {
    render(<UserMenu session={session} />);
    // Nome exato: "Ana Silva Ana Silva" (avatar + texto visível) não serve.
    expect(trigger()).toHaveAccessibleName("Ana Silva");
  });

  it("o avatar é decorativo: o nome já está no gatilho", () => {
    const { container } = render(<UserMenu session={session} />);
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("ao abrir, mostra o nome completo e o e-mail", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<UserMenu session={session} />);
    await user.click(trigger());
    expect(await screen.findByText("ana@exemplo.com")).toBeInTheDocument();
  });

  it("ao clicar em Sair chama POST /api/v1/sign-out e atualiza o router", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<UserMenu session={session} />);
    await clickSignOut(user);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/sign-out",
      expect.objectContaining({ method: "POST" }),
    );
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("avisa quando o sign-out responde com erro e não atualiza o router", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Erro interno" }),
    });
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<UserMenu session={session} />);
    await clickSignOut(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(SIGN_OUT_ERROR);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("avisa quando a rede falha durante o sign-out", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<UserMenu session={session} />);
    await clickSignOut(user);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(SIGN_OUT_ERROR);
    expect(alert).not.toHaveTextContent("Failed to fetch");
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("depois de uma falha permite tentar de novo, e o aviso some ao reabrir o menu", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<UserMenu session={session} />);
    await clickSignOut(user);
    await screen.findByRole("alert");

    await user.click(trigger());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(await screen.findByRole("menuitem", { name: "Sair" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("durante o sign-out o foco volta ao gatilho, que não reabre o menu", async () => {
    // A requisição fica pendente para observarmos o estado intermediário.
    let finish: (value: unknown) => void = () => {};
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<UserMenu session={session} />);
    await clickSignOut(user);

    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
    expect(trigger()).toHaveFocus();
    expect(trigger()).toHaveAttribute("aria-disabled", "true");

    await user.click(trigger());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    finish({ ok: true, status: 200 });
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });
});
