# Sign-In (Autenticação)

## Escopo
Front-End, Back-End

## Contexto
Precisamos impementação o fluxo para permitir pessoas acessar a plataforma:
- Email
- Senha

## Requisitos funcionais
1. Precisamos adicionar validação no formulário na camada de cliente
   1. Caso o formulário esteja válida podemos enviar a requisição para a API
2. Caso recebemos algum erro de autenticação queremos mostrar uma mensagem genérica e não especifica sobre o email ou a senha, por exemplo: Email ou senha inválidos.
3. Ler o email e password na tabela `accounts`
4. A requisição deve ser um `POST` para `/api/v1/sign-in` e receber os dados como JSON no `body`
5. Caso tudo dê certo retornar `200` ou erros de acordo com a validação:
   1. Crie uma nova sessão do Next.js com cookies
   2. `400`: Má formatação de dados
   3. `401`: Falha de credenciais
6. Se a pessoa não está logada precisamos mostrar um botào de login no cabeçalho
7. Se a pessoa está logada podemos mostrar um avatar com nome + sobrenome e email
   1. Você pode Dicebar (https://www.dicebear.com/) utilizar para mockup de avatars

## Requisitos não funcionais
- UI/UX: Boa experiência de uso através de uma interface bonita, elegante, moderna
  - Utilize suas habilidades (skill) de front-end design
  - VocÊ é um design export com anos de experiência
  - Você é o melhor design
- Performance: O processo de criação de conta precisa ser rápido

## Você deve
- Criar um layout base para a paltaforma
- Criar uma home sem nada por enquanto, apenas um titulo e esqueleto
- Criar um endpoint novo para autenticação
- Cria uma página nova para autenticação

## Você não deve
- Implementar qualquer outra funcionalidade que não esteja relacionada com sign-up (criação de contas).
- Não vamos realizar nenhum envio de email no momento, apenas processar a requisição, salvar no banco dados e tornar um sucesso.

## Tecnologias (Stack)
React.js, Next.js, React-Hook-Form, Shadcn, Tailwild, Supabase, TRCP, Bunjs.

## Critérios de aceitação
- Temos uma página para criar a nova conta em `/auth/sign-in`
- A página contém um formulário com validação
- A plataforma consegue se comunicar com a API para enviar os dados e receber uma resposta
- Estamos informando possíveis erros
  - Mostrar um alert em vermelho no formulário
- Navegar (`/`) para a home em caso de sucesso

## Resultado
Pessoas conseguem acessar suas contas.

Fluxo de autenticação implementado de ponta a ponta e verificado contra o projeto Supabase `sistema-avaliacao-produtos` em 15/11/2026.

### O que foi construído
- **Validação compartilhada:** `src/lib/validation/sign-in.ts` (zod) é usado pelo formulário (react-hook-form) e pelo endpoint. Normaliza o e-mail (trim + lowercase), como o cadastro, e só exige que a senha esteja preenchida.
- **Verificação de senha:** `verifyPassword` em `src/lib/password.ts` (`bcrypt.compare`).
- **Serviço:** `src/server/accounts/authenticate.ts` lê `id`, nome, sobrenome, `email`, `password` e `active` da tabela `accounts` pelo client service role e devolve os dados da sessão. Conta inexistente, conta inativa e senha incorreta lançam o mesmo `InvalidCredentialsError`; nos dois primeiros casos a senha ainda é comparada contra um hash bcrypt fixo, para o tempo de resposta não revelar quais e-mails têm conta.
- **Endpoints:** `POST /api/v1/sign-in` responde `200 { id }` com o cookie `session` (JWT assinado, `HttpOnly`, `SameSite=Lax`, `Path=/`, 7 dias, `Secure` em produção), `400` para JSON inválido ou schema rejeitado, `401 { error: "E-mail ou senha inválidos" }` para falha de credenciais e `500` para erros inesperados. `POST /api/v1/sign-out` responde `200 { ok: true }` e expira o cookie.
- **Página:** `/auth/sign-in` com o mesmo layout dividido do cadastro (painel de marca + formulário). Campos de e-mail e senha (com mostrar/ocultar), erros de validação por campo, erro da API em `Alert` vermelho; no sucesso navega para `/` e atualiza o roteador. As páginas de cadastro e de login apontam uma para a outra.
- **Cabeçalho:** `src/components/layout/site-header.tsx` renderiza a marca no shell estático e a área do usuário (`user-area.tsx`, Server Component que lê a sessão) dentro de `<Suspense>`. Sem sessão: botão "Entrar". Com sessão: avatar do DiceBear (`avatar-url.ts`) com nome e sobrenome; o menu (`user-menu.tsx`) mostra nome completo, e-mail e "Sair".
- **Layout base e home esqueleto:** entregues na Fase 0 da orquestração (`src/app/(site)/layout.tsx` e `src/app/(site)/page.tsx`).

### Verificação
- `npm test`: 64 testes em 15 arquivos, todos passando (26 novos desta feature).
- `npx biome check .`: sem erros.
- `npm run build`: sucesso; rotas `/auth/sign-in` (estática), `/api/v1/sign-in`, `/api/v1/sign-out` (dinâmicas) e `/` (partial prerender) geradas.
- Fluxo real por HTTP (`curl`, dev server na porta 3001) com uma conta `@example.com` criada pelo `POST /api/v1/sign-up`:
  - senha incorreta e e-mail inexistente → `401` com a mesma mensagem "E-mail ou senha inválidos", sem `Set-Cookie`;
  - e-mail mal formatado/senha vazia e JSON inválido → `400` "Dados inválidos";
  - credenciais corretas, com o e-mail em maiúsculas e com espaços → `200 { id }` e `Set-Cookie: session=<jwt>; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
  - `GET /auth/sign-in` → `200` com o título "Entrar — Sistema de Avaliação de Produto";
  - `GET /` com o cookie → HTML contém nome, sobrenome, e-mail e a URL do avatar; sem cookie ou com cookie adulterado → botão "Entrar";
  - `POST /api/v1/sign-out` → `200` e `Set-Cookie: session=; … Max-Age=0`; a home volta a mostrar "Entrar".
- A verificação visual no navegador ficou para a etapa de integração (o navegador é compartilhado entre os agentes).

### Decisões e desvios conscientes da spec
- **`POST /api/v1/sign-out`:** não está na spec, mas sem ele a pessoa logada não consegue sair.
- **Sessão própria em cookie assinado (JWT HS256, `jose`)** em vez de Supabase Auth: a spec pede leitura de e-mail e senha na tabela `accounts`.
- **Conta inativa recebe `401` genérico:** a spec não cita `active`; dizer que a conta está desativada confirmaria que o e-mail existe.
- **E-mail exibido dentro do menu do avatar:** no cabeçalho aparecem avatar, nome e sobrenome; o e-mail fica no menu para não poluir a barra em telas pequenas.
- **Avatar com `next/image` sobre as iniciais locais** em vez do `AvatarImage` do shadcn: as iniciais aparecem enquanto a imagem carrega ou se o DiceBear estiver indisponível.
- **tRPC e Bun continuam fora:** mesmo motivo da spec de sign-up (paths REST fixados; projeto usa npm).

### Pendências conhecidas
Os achados da revisão final foram corrigidos na branch `fix/auth`. O que mudou no comportamento descrito acima:
- **Checagem de `Origin` (login CSRF):** `POST /api/v1/sign-in` e `POST /api/v1/sign-out` respondem `403 { error: "Origem não permitida" }` quando o header `Origin` está presente e não corresponde ao host da requisição (`x-forwarded-host`, depois `host`); requisição sem `Origin` (curl, testes) continua aceita (`src/lib/http/same-origin.ts`). O sign-in também responde `415` quando o `Content-Type` não é `application/json`.
- **Limite de tentativas de senha:** cada login que falha por credenciais grava uma linha em `sign_in_attempts` com o e-mail normalizado, exista ou não a conta. Com 5 falhas do mesmo e-mail nos últimos 15 minutos, o sign-in responde `429` com `Retry-After` (segundos) e "Muitas tentativas de login. Tente de novo em N minutos.", sem verificar a senha; login correto apaga as falhas daquele e-mail. Se o banco falhar ao registrar ou consultar as tentativas, o erro é logado e o login segue (`src/server/accounts/sign-in-attempts.ts`).
- **Mensagens de falha:** falha de rede no login e no cadastro mostra "Não foi possível conectar. Verifique sua conexão e tente de novo." (`src/lib/http/post-json.ts`); falha no sign-out (rede ou status não-2xx) mostra um aviso com `role="alert"` sob o menu do usuário, e a pessoa continua logada.
- **Acessibilidade:** o gatilho do menu tem o nome completo como único nome acessível (o avatar virou decorativo); o botão mostrar/ocultar senha não usa mais `aria-pressed`; os campos inválidos dos formulários de login e de cadastro apontam para a mensagem de erro com `aria-describedby`; durante o sign-out o gatilho fica `aria-disabled` e recebe o foco de volta.
- **Duplo envio:** os botões "Entrar" e "Criar conta" continuam desabilitados entre a resposta de sucesso e a navegação.

O que continua em aberto:
- O limite de tentativas é só por e-mail (não por IP): quem conhece o e-mail de outra pessoa consegue bloquear o login dela por 15 minutos errando a senha 5 vezes, e um atacante que varia os e-mails não é contido.
- A contagem não é atômica: requisições simultâneas podem passar algumas tentativas além da quinta. A janela usa o relógio da aplicação e o `created_at` usa o do banco.
- As linhas antigas de `sign_in_attempts` só são apagadas no login bem-sucedido; não há rotina de limpeza.
- `POST /api/v1/sign-up` não recebeu a checagem de `Origin`/`Content-Type`.
- As correções de acessibilidade foram verificadas por testes de componente (jsdom), não com leitor de tela nem no navegador.

### Configuração local
Além das variáveis do Supabase, `.env.local` precisa de `SESSION_SECRET` com pelo menos 32 caracteres aleatórios.
