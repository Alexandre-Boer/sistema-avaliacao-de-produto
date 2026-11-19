# Sign-Up (Criação de conta)

## Escopo
Front-End, Back-End, Banco de Dados

## Contexto
Precisamos implementar o fluxo para criação de contas na plataforma. As pessoas precisarão fornecer:
- Primeiro Nome
- Sobrenome
- Email
- Senha
- Confirmação de senha

## Requisitos funcionais
1. Precisamos adicionar validação no formulário na camada de cliente
    1. Caso o formulário esteja válido podemos enviar a requisição para a API
2. Os campos de nome e sobrenome devem ser separados
3. Precisamos criar uma nova conta no banco de dados na tabela de `accounts`
    1. `id`: nanoid (gerado com `nanoid` na camada de API)
    2. `first_name`: text
    3. `last_name`: text
    4. `created_at`: timestamp
    5. `updated_at`: timestamp
    6. `active`: boolean
    7. `email`: text
    8. `password`: text (hashed)
    9. `salt`: text (hashed)
4. A requisição deve ser um `POST` para `api/v1/sign-up` e receber os dados como SJON no `body`
5. Caso tudo dê certo retonar `201` ou erros de acordo com a validação:
    1. `400`: Má formatação de dados

# Requisitos não funcionais
- Segurança: Precisamos salvar as senhas de forma segura no banco de dados
    - Precisamos receber os dados do cliente de forma segura usando HTTPS (para previnir network sniff)
- UI/UX: Boa experiência de uso através de uma interface bonita, elegante e moderna
- Performance: O Processo de criação de conta precisa ser rápido

## Você deve
- Criar a base do projeto com um endpoint inicial para criação de conta
- Criar a base do projeto com uma página inicial para a interface de criação de conta
- Configurar as bibliotecas base

## Você não deve
- Implementar qualquer outra funcionalidade que não esteja relacionada com sign-up (criação de contas)
- Não vamos realizar nenhum envio de e-mail no momento, apenas processar a requisição, salvar no banco de dados e retornar um sucesso

## Tecnologias (Stack)
React.js, Next.js, React-Hook-Form, Shadcn, Tailwind, Supabase, TRPC

## Critérios de aceite
- Temos uma página para criar a nova conta em `/auth/sign-up`
- A página contém um formulário com validação
- A plataforma consegue se comunicar com a API para enviar os dados e receber uma resposta
- Estamos informando possíveis erros
    - Mostrar um alert em vermelho no formulário
- Estamos informando o sucesso de criação da conta
    - Navegador para `/auth/sign-up/success`


## Resultado

Fluxo de criação de conta implementado de ponta a ponta e verificado contra o projeto Supabase `sistema-avaliacao-produtos` em 11/11/2026.

### O que foi construído
- **Base do projeto:** Next.js (App Router, pasta `src/`), TypeScript estrito, Tailwind, shadcn/ui, Biome (lint/format), Vitest + Testing Library.
- **Banco de dados:** migração `supabase/migrations/20261104000000_create_accounts.sql` cria `public.accounts` com as 9 colunas da spec, índice único em `email` e RLS habilitado sem policies (somente o service role acessa a tabela). Aplicada no projeto remoto como migração `create_accounts`.
- **Validação compartilhada:** `src/lib/validation/sign-up.ts` (zod) é usado tanto pelo formulário (react-hook-form + `@hookform/resolvers`) quanto pelo endpoint. Normaliza e-mail (trim + lowercase), exige nome/sobrenome, senha com mínimo de 8 caracteres e confirmação idêntica.
- **Hash de senha:** `src/lib/password.ts` usa bcryptjs (`genSalt(10)` + `hash`). O salt é persistido na coluna `salt`, embora o bcrypt já o embuta no hash.
- **Serviço:** `src/server/accounts/create-account.ts` gera o `id` com nanoid, hasheia a senha e insere via client server-side (`src/lib/supabase/admin.ts`, service role, `server-only`). Violação de unique (`23505`) vira `DuplicateEmailError`.
- **Endpoint:** `POST /api/v1/sign-up` (`src/app/api/v1/sign-up/route.ts`) responde `201 { id }`, `400` para JSON inválido ou schema rejeitado, `409` para e-mail duplicado e `500` para erros inesperados.
- **Interface:** `/auth/sign-up` (formulário em `Card`, erros em `Alert` vermelho) e `/auth/sign-up/success`. React Query (`useMutation`) faz a chamada à API; `201` navega para a página de sucesso.

### Verificação
- `npm test`: 22 testes em 6 arquivos, todos passando.
- `npx biome check .`: sem erros.
- `npm run build`: sucesso; rotas `/auth/sign-up`, `/auth/sign-up/success` e `/api/v1/sign-up` geradas.
- Fluxo real no navegador: conta criada → navegação para `/auth/sign-up/success`; linha em `accounts` com `id` de 21 caracteres, `password` em formato bcrypt (`$2b$10$…`, 60 caracteres), `salt` preenchido (29 caracteres, prefixo do hash) e `active = true`.
- Reenvio do mesmo e-mail com maiúsculas e espaços (`  ANA.Teste@Exemplo.COM `): normalizado para o mesmo valor, API respondeu `409` e o formulário exibiu o alert "E-mail já cadastrado"; nenhuma linha duplicada no banco.

### Decisões e desvios conscientes da spec
- **`409` para e-mail duplicado:** a spec só define `400` para má formatação; retornar `500` para duplicidade seria inaceitável, então o caso recebe `409 Conflict` com mensagem clara.
- **`timestamptz` em vez de `timestamp`:** boa prática em Postgres para evitar ambiguidade de fuso horário.
- **bcryptjs em vez do Crypto nativo:** decisão registrada em `docs/ARCHITECTURE.md`.
- **tRPC adiado:** a spec fixa o path REST `/api/v1/sign-up` e status codes HTTP, incompatíveis com o envelope do tRPC. A configuração do tRPC fica para a primeira feature que o utilize.
- **Sem policies de RLS:** a tabela guarda hashes de senha e só é acessada pelo servidor via service role; nenhuma chave pública deve alcançá-la.

### Configuração local
Copiar `.env.example` para `.env.local` e preencher `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` com os valores do projeto Supabase (Dashboard → Project Settings → API Keys). A chave de serviço nunca deve ser commitada nem receber o prefixo `NEXT_PUBLIC_`.
