# Arquitetura do Projeto

Uma única aplicação Next.js serve a interface e a API. O navegador nunca fala com o banco: todo acesso ao Supabase passa pelo servidor.

```
Navegador ──► Next.js (páginas + /api/v1) ──► Supabase (PostgreSQL)
                      │
                      └──► Agente Mastra ──► modelo de linguagem (OpenAI ou Ollama local)

n8n ──► POST /api/v1/products
```

## Camadas

| Pasta | Responsabilidade |
| --- | --- |
| `src/app/` | Rotas: páginas (Server Components) e endpoints (`api/v1`). Sem regra de negócio. |
| `src/components/` | Componentes de interface, por domínio (`auth`, `products`, `feedback`, `layout`) e a base do design system (`ui`). |
| `src/server/` | Regras de negócio e acesso ao banco, por domínio (`accounts`, `products`, `feedbacks`, `ai-summary`). |
| `src/lib/` | Utilitários compartilhados: sessão, senha, schemas de validação, cliente do Supabase, helpers de HTTP. |
| `src/mastra/` | Agente de IA e escolha do modelo. |

Uma página ou endpoint chama um serviço de `src/server/`, que valida, consulta o banco e devolve tipos da aplicação (camelCase). Erros de negócio são classes próprias (por exemplo `DuplicateFeedbackError`), que o endpoint traduz em um status HTTP.

## Front-End

- **TypeScript**: linguagem principal, em modo estrito.
- **Next.js 16** (App Router, Cache Components): páginas renderizadas no servidor, com as partes dinâmicas chegando por streaming em `<Suspense>`.
- **React 19**: componentização da interface.
- **Tailwind CSS 4**: estilização.
- **shadcn/ui** (sobre Radix UI): componentes base do design system, em `src/components/ui`.
- **React Hook Form + Zod**: formulários e validação. O mesmo schema vale no navegador e no servidor.
- **TanStack Query**: mutations (login, cadastro, avaliação) e a lista de produtos com rolagem infinita.
- **Biome**: lint e formatação.

## Back-End

- **Route Handlers do Next.js**: os endpoints em `src/app/api/v1`.
- **Sessão própria**: JWT HS256 (`jose`) em cookie HttpOnly, com validade de 7 dias.
- **bcryptjs**: hash da senha.
- **Proteções**: checagem de origem nos `POST`, limite de tentativas de login por e-mail, limite de tamanho do corpo da requisição.

## Banco de dados

Supabase (PostgreSQL). O esquema está em `supabase/migrations/`.

| Tabela | Conteúdo |
| --- | --- |
| `accounts` | Contas (nome, e-mail, hash da senha) |
| `products` | Produtos (nome, descrição, link externo, imagem) |
| `products_feedbacks` | Avaliações (nota de 1 a 5 e comentário), uma por conta por produto |
| `sign_in_attempts` | Tentativas de login que falharam, para o limite por e-mail |
| `products_ai_summaries` | Resumo da IA de cada produto e a quantidade de avaliações que ele cobriu |

Todas as tabelas têm RLS habilitado e nenhuma policy: só o servidor, com a chave `service_role`, lê e grava.

## Inteligência Artificial

- **Mastra** (`@mastra/core`): define o agente que resume as avaliações de um produto (`src/mastra/agents/feedback-summary-agent.ts`).
- **Modelo configurável** por variável de ambiente: `openai/gpt-4o-mini` por padrão; em desenvolvimento, um modelo local gratuito via Ollama (`infra/ollama/docker-compose.yml`).
- O resumo fica guardado na tabela `products_ai_summaries` e só é refeito quando chega avaliação nova.
- Os comentários entram no pedido ao modelo como conteúdo não confiável, delimitados, e sem dados de quem avaliou.

## Automação

- **n8n** (`infra/n8n/`): fluxo que lê uma página pública de ofertas e cadastra os produtos por `POST /api/v1/products`.

## Testes e integração contínua

- **Vitest + Testing Library**: testes ao lado do código (`*.test.ts(x)`), com o Supabase e o agente de IA substituídos por dublês.
- **GitHub Actions** (`.github/workflows/ci.yml`): lint, testes e build a cada push e pull request.

## Infraestrutura

A aplicação roda localmente (`npm run dev`). Ela foi pensada para hospedagem na Vercel, com o Supabase como banco gerenciado, mas não há um ambiente publicado.
