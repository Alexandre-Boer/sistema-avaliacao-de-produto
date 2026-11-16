import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SiteError from "@/app/(site)/error";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SiteError", () => {
  it("mostra a mensagem em português e registra o erro", () => {
    const error = new Error("falha no render");
    render(<SiteError error={error} retry={() => {}} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Algo deu errado" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    // Detalhes técnicos ficam no console, não na tela.
    expect(screen.queryByText(/falha no render/)).not.toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith(error);
  });

  it("chama retry ao clicar em Tentar novamente", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(<SiteError error={new Error("x")} retry={retry} />);

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("oferece o caminho de volta para a lista de produtos", () => {
    render(<SiteError error={new Error("x")} retry={() => {}} />);

    expect(
      screen.getByRole("link", { name: "Ver todos os produtos" }),
    ).toHaveAttribute("href", "/");
  });
});
