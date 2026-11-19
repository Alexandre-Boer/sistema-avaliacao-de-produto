# Orquestração — Sign-In, Home e Feedback em paralelo

**Objetivo:** executar as specs `sign-in`, `home` e `feedback` com três subagentes em paralelo, cada um em seu próprio worktree/branch, e integrar o resultado no `main` com verificação completa.

**Por que uma Fase 0:** as specs se sobrepõem. Sign-in e Home disputam a página inicial; Feedback precisa da sessão (Sign-in) e da tabela `products` (Home). Sem contratos prévios, os três agentes criariam versões divergentes dos mesmos arquivos e o merge viraria retrabalho. A Fase 0 cria esses contratos uma única vez no `main`; os planos consomem interfaces fixas e cada arquivo tem um único dono.

**Planos das features:**
- `docs/plans/2026-11-13-sign-in.md`
- `docs/plans/2026-11-13-home.md`
- `docs/plans/2026-11-13-feedback.md`

---

## Fase 0 — Fundação compartilhada (orquestrador, no `main`)

Executada após a aprovação dos planos e antes do dispatch. Um commit por item.

1. **Specs:** `git mv docs/specs/*.md.txt` → `docs/specs/*.md` (padrão do repo; cada agente escreve a seção `## Resultado` na sua própria spec ao final).
2. **Migrations (escritas e aplicadas no projeto Supabase `sistema-avaliacao-produtos`):**
   - `supabase/migrations/20261113000000_create_products.sql`: `id text pk`, `name text not null`, `description text`, `image_url text`, `external_link text not null`, `score boolean not null default false`, `created_at/updated_at timestamptz default now()`; índice `(created_at desc, id desc)`; RLS habilitado sem policies.
   - `supabase/migrations/20261113000100_create_products_feedbacks.sql`: `id text pk`, `score integer not null check (score between 1 and 5)`, `comment text not null`, `created_at timestamptz default now()`, `created_by text not null references accounts(id)`, `product_id text not null references products(id) on delete cascade`; índice `(product_id, created_at desc)`; RLS habilitado sem policies.
3. **Dependências e componentes:** `npm i jose`; `npx shadcn@latest add avatar dropdown-menu skeleton textarea badge` (evita que dois agentes gerem o mesmo arquivo em `components/ui`).
4. **`next.config.ts`:** `images.remotePatterns: [{ protocol: "https", hostname: "**" }]` (imagens de produtos vêm de URLs arbitrárias; avatares do DiceBear).
5. **Sessão (`src/lib/session.ts` + testes):** módulo completo, pois Sign-in (emite) e Feedback (lê) dependem dele.
   - `type Session = { accountId: string; firstName: string; lastName: string; email: string }`
   - `SESSION_COOKIE_NAME = "session"`, duração 7 dias, JWT HS256 (`jose`) assinado com `SESSION_SECRET`.
   - `createSessionToken(session: Session): Promise<string>`
   - `verifySessionToken(token: string): Promise<Session | null>` (inválido/expirado/adulterado → `null`)
   - `serializeSessionCookie(token: string): string` → `session=<token>; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800` (+ `; Secure` quando `NODE_ENV === "production"`)
   - `serializeClearedSessionCookie(): string` → mesmo cookie com `Max-Age=0`
   - `getSession(): Promise<Session | null>` — lê `cookies()` de `next/headers` e verifica o token. `import "server-only"`.
   - `.env.example` ganha `SESSION_SECRET=`; `.env.local` recebe um valor aleatório de 32+ bytes.
6. **Tipo de produto (`src/server/products/product.ts` + teste):** `type Product = { id; name; description: string | null; imageUrl: string | null; externalLink; score: boolean; createdAt; updatedAt }`, `type ProductRow` (snake_case, espelho da tabela) e `toProduct(row: ProductRow): Product`.
7. **Layout base e home esqueleto:** grupo de rotas `src/app/(site)/` com `layout.tsx` (renderiza `<SiteHeader />` + `children`), `src/components/layout/site-header.tsx` (placeholder: `Wordmark` + botão "Entrar" → `/auth/sign-in`) e `src/app/(site)/page.tsx` (título "Produtos" + esqueleto). O antigo `src/app/page.tsx` (landing) é removido. As páginas `/auth/*` ficam fora do grupo e mantêm o layout próprio em tela cheia.
   - Isso cumpre os itens "layout base" e "home esqueleto" da spec de sign-in; a Home substitui o esqueleto pela listagem real.
8. **Worktrees** (fora do OneDrive, para não sincronizar `node_modules`):
   - `~/worktrees/sap-sign-in` (branch `feat/sign-in`, porta 3001)
   - `~/worktrees/sap-home` (branch `feat/home`, porta 3002)
   - `~/worktrees/sap-feedback` (branch `feat/feedback`, porta 3003)
   - Em cada um: copiar `.env.local` e rodar `npm ci`.

## Donos de arquivos (regra de não-conflito)

| Área | Dono |
|---|---|
| `src/lib/validation/sign-in.ts`, `src/lib/password.ts`, `src/server/accounts/authenticate.ts`, `src/app/api/v1/sign-in/**`, `src/app/api/v1/sign-out/**`, `src/app/auth/**`, `src/components/layout/**`, `src/app/(site)/layout.tsx` | Sign-in |
| `src/lib/validation/product.ts`, `src/server/products/list-products.ts`, `src/server/products/create-product.ts`, `src/app/api/v1/products/route.ts`, `src/components/products/product-card.tsx`, `src/components/products/product-feed.tsx`, `src/app/(site)/page.tsx` | Home |
| `src/lib/validation/feedback.ts`, `src/server/products/get-product.ts`, `src/server/feedbacks/**`, `src/app/api/v1/products/[id]/**`, `src/app/(site)/products/**`, `src/components/feedback/**`, `src/components/products/product-header.tsx` | Feedback |
| `src/lib/session.ts`, `src/server/products/product.ts`, migrations, `next.config.ts`, `package.json`, `components/ui/**` | Fase 0 (ninguém altera durante a execução; se um agente precisar, reporta em vez de editar) |

## Fase 1 — Dispatch

Três agentes `general-purpose` lançados na mesma mensagem. Cada prompt contém: caminho do worktree, branch, porta, caminho do plano e da spec, regra de donos de arquivos, instrução de usar `superpowers:executing-plans` (tarefa a tarefa, TDD, commits frequentes), de usar o skill `frontend-design` nas tarefas de UI, e de terminar com `npm test`, `npx biome check .`, `npm run build` e verificação no navegador. Cada agente escreve a seção `## Resultado` na sua spec (mesmo formato de `docs/specs/sign-up.md`).

Regra de bloqueio: se um agente precisar alterar um arquivo que não é seu, ele registra a necessidade no relatório final e segue; o orquestrador resolve na integração.

## Fase 2 — Integração (orquestrador)

1. Revisão de cada branch (code-review por subagente, uma por branch) e correções pontuais.
2. Merge no `main` na ordem **home → sign-in → feedback** (feedback depende das outras duas em runtime). Conflitos esperados: nenhum, dado o mapa de donos; se `(site)/page.tsx` conflitar, vence a versão da Home.
3. Verificação integrada: `npm test`, `npx biome check .`, `npm run build`; no navegador: criar conta → entrar → header mostra avatar com nome e e-mail → home lista produtos com scroll infinito → clicar no nome → detalhes → enviar avaliação → avaliação aparece na lista → sair → bloco de "faça login" aparece na página de detalhes.
4. Remover worktrees e branches; relatório final ao usuário.

## Decisões conscientes (para aprovação)

- **Sessão própria com cookie assinado (JWT HS256, `jose`, 7 dias, HttpOnly)** em vez de Supabase Auth: a spec fixa `POST /api/v1/sign-in` lendo a tabela `accounts` já existente.
- **Endpoint `POST /api/v1/sign-out`** não está na spec, mas sem ele a pessoa logada não consegue sair, o que inviabiliza testar o estado "deslogado" do feedback. Pequeno e isolado.
- **Coluna `image_url` em `products`:** a spec lista as colunas sem imagem, mas exige mostrar imagem e aceitá-la no `POST`.
- **`score boolean` em `products`:** mantido como a spec descreve, com `default false`. Parece um erro de spec (talvez numérico), mas nada depende dele agora.
- **`POST /api/v1/products` sem autenticação**, como a spec descreve ("inserir manualmente"). Proteger fica para uma spec futura.
- **Paginação por `offset`/`limit`** (`range` do Supabase); simples e suficiente para o volume do projeto.
- **tRPC continua adiado** (paths REST fixados pelas specs); **Bun não entra** (projeto já usa npm).
- **`cacheComponents` está ativo no `next.config.ts`:** todo Server Component que lê `cookies()` ou o banco precisa estar dentro de `<Suspense>` (ou de um `loading.tsx`), senão o build falha. Os planos já posicionam os boundaries.
