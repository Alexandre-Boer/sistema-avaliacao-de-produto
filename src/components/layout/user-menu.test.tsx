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

beforeEach(() => {
  refreshMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("UserMenu", () => {
  it("mostra o avatar com o nome completo e, ao abrir, o e-mail", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<UserMenu session={session} />);
    expect(screen.getByRole("img", { name: "Ana Silva" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Ana Silva/ }));
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
    await user.click(screen.getByRole("button", { name: /Ana Silva/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Sair" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/sign-out",
      expect.objectContaining({ method: "POST" }),
    );
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });
});
