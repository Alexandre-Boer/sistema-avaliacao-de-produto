import { createAdminClient } from "@/lib/supabase/admin";
import {
  createAccount,
  DuplicateEmailError,
} from "@/server/accounts/create-account";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const validInput = {
  firstName: "Ana",
  lastName: "Silva",
  email: "ana@exemplo.com",
  password: "senha-forte-123",
  passwordConfirmation: "senha-forte-123",
};

const insertSpy = vi.fn();

beforeEach(() => {
  insertSpy.mockReset();
  insertSpy.mockResolvedValue({ error: null });
  vi.mocked(createAdminClient).mockReturnValue({
    from: vi.fn(() => ({ insert: insertSpy })),
  } as never);
});

describe("createAccount", () => {
  it("insere a conta com id nanoid, senha hasheada e active true", async () => {
    const result = await createAccount(validInput);
    expect(result.id).toHaveLength(21); // nanoid padrão
    const row = insertSpy.mock.calls[0][0];
    expect(row).toMatchObject({
      first_name: "Ana",
      last_name: "Silva",
      email: "ana@exemplo.com",
      active: true,
    });
    expect(row.password).not.toBe(validInput.password);
    expect(row.password).toMatch(/^\$2[aby]\$/);
    expect(row.salt).toBeTruthy();
  });

  it("lança DuplicateEmailError quando o insert viola a unique de email (23505)", async () => {
    insertSpy.mockResolvedValueOnce({
      error: { code: "23505", message: "duplicate key" },
    });
    await expect(createAccount(validInput)).rejects.toBeInstanceOf(
      DuplicateEmailError,
    );
  });

  it("relança erros inesperados do banco", async () => {
    insertSpy.mockResolvedValueOnce({
      error: { code: "XX000", message: "boom" },
    });
    await expect(createAccount(validInput)).rejects.toThrow("boom");
  });
});
