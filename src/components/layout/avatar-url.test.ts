import { avatarUrl } from "@/components/layout/avatar-url";

describe("avatarUrl", () => {
  it("gera URL do DiceBear com o nome completo como seed", () => {
    expect(avatarUrl("Ana", "Silva")).toBe(
      "https://api.dicebear.com/9.x/initials/png?seed=Ana%20Silva&size=64",
    );
  });

  it("codifica caracteres especiais do nome", () => {
    expect(avatarUrl("João", "D'Ávila & Cia")).toBe(
      `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent("João D'Ávila & Cia")}&size=64`,
    );
  });
});
