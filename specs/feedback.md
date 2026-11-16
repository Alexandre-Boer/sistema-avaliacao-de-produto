# Feedback

## Escopo
Front-End, Back-End, Banco de Dados

## Contexto
Precisamos impementação o fluxo permitindo as pessoas logadas (autenticadas) adicionar novas avaliações aos produtos

## Requisitos funcionais
1. Caso a pessoa não esteja logada precisamos mostrar um bloco exigindo a autenticação
2. Caso ela esteja logada podemos mostrar o formulário e permitir novas avalaições
   1. Cada avaliação deve conter uma nova de 1-5 + comentário
3. Nova tabela `products_feedbacks`
   1. `id`: nanoid
   2. `score`: int
   3. `comment`: text
   4. `created_at`: timestamp
   5. `created_by` nanoid
   6. `product_id`: nanoid
4. A paginad e detalhes deve listar todos os comentários existentes para o produto e deppis renderizar o form para adicionar novos

## Requisitos não funcionais
- UI/UX: Boa experiência de uso através de uma interface bonita, elegante, moderna
- Performance: O processo de criação de conta precisa ser rápido

## Você deve
- Criar um endpoint novo para adicionar comentários
- Criar uma nova pagina de detalhes `/products/id`

## Você não deve
- Implementar qualquer outra funcionalidade que não esteja relacionada com sign-up (criação de contas).
- Não vamos realizar nenhum envio de email no momento, apenas processar a requisição, salvar no banco dados e tornar um sucesso.

## Tecnologias (Stack)
React.js, Next.js, React-Hook-Form, Shadcn, Tailwild, Supabase, TRCP, Bunjs.

## Critérios de aceitação
- Pagina de detalhes do produto mostrando as informações do produto + avaliaçÕes + formulário para nova avaliação

## Resultado
Pessoas conseguem ver os produtos de forma publica, sem autenticação mas não conseguem adicionar novos comentários

Página de detalhes do produto com avaliações implementada de ponta a ponta e verificada contra o projeto Supabase `sistema-avaliacao-produtos` em 15/11/2026.

### O que foi construído
- **Banco de dados:** a tabela `public.products_feedbacks` (migração `supabase/migrations/20261113000100_create_products_feedbacks.sql`, Fase 0) tem as 6 colunas da spec, `check (score between 1 and 5)`, FKs para `accounts` e `products` e RLS habilitado sem policies.
- **Validação compartilhada:** `src/lib/validation/feedback.ts` (zod) é usado pelo formulário e pelo endpoint. Nota inteira de 1 a 5 (precisa ser um número de verdade), comentário com `trim`, obrigatório e com no máximo 1000 caracteres.
- **Serviços:** `src/server/products/get-product.ts` (`getProductById`, `null` quando não existe), `src/server/feedbacks/list-feedbacks.ts` (avaliações do produto com nome do autor, mais recentes primeiro) e `src/server/feedbacks/create-feedback.ts` (id com nanoid; violação da FK do produto, `23503`, vira `ProductNotFoundError`).
- **Endpoint:** `POST /api/v1/products/<id>/feedbacks` (`src/app/api/v1/products/[id]/feedbacks/route.ts`) responde `401` sem sessão, `400` para JSON inválido ou schema rejeitado, `404` para produto inexistente, `201 { id }` no sucesso e `500` para erros inesperados. O autor (`created_by`) vem somente da sessão e o produto somente da URL.
- **Interface:** `/products/<id>` (`src/app/(site)/products/[id]/page.tsx`) mostra, nesta ordem: cabeçalho do produto (imagem ou placeholder, nome, descrição, botão "Ver na loja"), lista de avaliações (contagem, nota média, distribuição das notas em barras, autor, estrelas, data e comentário) e o formulário de nova avaliação (pessoa logada) ou o bloco "Entre na sua conta para avaliar este produto." com os botões "Entrar" e "Criar conta" (pessoa deslogada). O formulário (react-hook-form + React Query) usa estrelas feitas com rádios nativos, contador de caracteres e, no `201`, chama `router.refresh()` para a lista incluir a nova avaliação.
- **Carregamento e erro:** `not-found.tsx` mostra "Produto não encontrado"; a lista de avaliações e o bloco "Sua avaliação" chegam por streaming, cada um com o seu esqueleto (ver "Correções da revisão de código").

### Correções da revisão de código (15/11/2026)
- **`404` de verdade para produto inexistente:** `GET /products/<id inexistente>` respondia `200` com a tela de "não encontrado", porque o `loading.tsx` fazia a resposta começar antes da consulta ao banco. Agora a busca do produto acontece antes do primeiro byte, fora de qualquer `<Suspense>`; o `loading.tsx` saiu e só a lista de avaliações e o bloco que depende da sessão ficam em `<Suspense>` próprios (`src/components/feedback/feedback-skeletons.tsx`). A página exporta `instant = false` (a espera é intencional). Para valer também em produção, `getProductById` usa `use cache` com `cacheLife("minutes")` e a página exporta `unstable_paramMatching = { id: "blocking" }` (ver a decisão abaixo). Id com `%00` na URL também responde `404`, na página e no endpoint.
- **Uma avaliação por pessoa por produto:** o banco tem o índice único `products_feedbacks_product_id_created_by_key` (migração `20261115000100_unique_feedback_per_account.sql`). O endpoint responde `409` com "Você já avaliou este produto" quando a conta já avaliou. Na página, quem está logado e já avaliou vê o aviso "Você já avaliou este produto." no lugar do formulário (`src/server/feedbacks/has-feedback.ts` e `src/components/feedback/already-reviewed.tsx`); o formulário trata o `409` do mesmo jeito (caso de duas abas).
- **Lista limitada e resumo sempre correto:** `listFeedbacks` devolve as 50 avaliações mais recentes e o resumo de todas. Contagem, média e distribuição saem de cinco contagens feitas no banco, uma por nota (`count: "exact"` com `head: true`), e não das linhas devolvidas, porque a API do Supabase corta qualquer consulta em 1000 linhas. Quando há mais avaliações do que as listadas, a página mostra "Mostrando as 50 avaliações mais recentes de N.". Não foi preciso migração nem função SQL.
- **Comentário inválido:** comentário sem nenhum caractere visível (por exemplo só `U+200B`, de largura zero) é rejeitado com "Escreva um comentário"; comentário com o caractere NUL (`U+0000`), que o Postgres não armazena, responde `400` em vez de `500`.
- **Conta removida com sessão ainda válida:** a violação da FK do autor vira `401` com "Sua sessão expirou. Entre novamente para avaliar." e o cookie de sessão é apagado; o formulário mostra o aviso com o link "Entrar".
- **Formulário:** depois do envio o formulário dá lugar à confirmação "Avaliação enviada.", então a mensagem de sucesso não aparece mais junto com erros de validação. O seletor de nota é um `radiogroup` com `aria-invalid` e `aria-describedby` no grupo e em cada rádio (`aria-invalid` não é suportado em `fieldset`), e o erro do comentário fica ligado ao campo.
- **Média e avatar:** as estrelas da média são preenchidas em parte e partem do mesmo valor arredondado do número (notas 5 e 4 mostram "4,5" com quatro estrelas e meia). A inicial do avatar usa o primeiro grafema do nome, então um emoji não é cortado ao meio.

### Verificação
- `npm test`: 65 testes em 15 arquivos, todos passando (28 novos desta feature em 7 arquivos).
- `npx biome check .`: sem erros (70 arquivos).
- `npm run build`: sucesso; rotas `/products/[id]` (Partial Prerender) e `/api/v1/products/[id]/feedbacks` (dinâmica) geradas.
- Verificação por HTTP (curl, dev server na porta 3003) com um produto e uma conta de teste:
  - `/products/<id>` sem cookie: `200`, com o produto, "Ainda não há avaliações. Seja a primeira pessoa a avaliar." e o bloco de autenticação; sem formulário.
  - Com o cookie `session=<token>`: `200`, formulário presente ("Enviar avaliação") e bloco de autenticação ausente.
  - `POST` sem cookie e com cookie adulterado: `401`. Nota 6, comentário em branco e corpo não-JSON: `400`. Produto inexistente: `404`.
  - `POST` válido com `created_by` e `productId` forjados no corpo: `201`; a linha em `products_feedbacks` ficou com `created_by` da conta da sessão e `product_id` da URL.
  - Depois do `POST`, a página lista a avaliação com o nome do autor, "1 avaliação" e média "4,0".
  - `/products/nao-existe`: mostra "Produto não encontrado" (ver a decisão sobre o status abaixo).
- A verificação visual no navegador ficou para a etapa de integração das três features.
- Depois das correções da revisão de código (os números acima são da entrega original):
  - `npm test`: 165 testes em 28 arquivos, todos passando. `npx biome check .`: sem erros (100 arquivos). `npm run build`: sucesso, com `/products/[id]` como Partial Prerender.
  - Por curl, no dev server e no servidor de produção (`next start`), ambos na porta 3003: `/products/nao-existe` e `/products/%00` respondem `404` (em produção, já na primeira visita a um id nunca visto); `/products/fbtest_produto_feedback` responde `200`.
  - Por curl, no dev server: segundo `POST` da mesma conta no mesmo produto `409`; comentário com NUL `400`; comentário só com `U+200B` `400`; `POST` com id `%00` `404`; `POST` com sessão de uma conta que não existe `401` com o cookie apagado.
  - Página com o cookie de quem já avaliou: mostra "Você já avaliou este produto." e não tem o formulário. Com sessão válida de quem ainda não avaliou: formulário presente. Sem cookie: bloco de autenticação.

### Decisões e desvios conscientes da spec
- **`404` real na página, com um custo:** a página do produto bloqueia até a busca do produto terminar, sem esqueleto de página inteira (o `loading.tsx` saiu). Em produção isso sozinho não bastava: com `partialPrefetching` ligado no `next.config.ts`, a primeira visita a um id ainda não visto recebe o shell genérico da rota com status `200`. Por isso a página usa `unstable_paramMatching = { id: "blocking" }`, uma API ainda instável e fora da documentação instalada do Next.js 16.4.5, e `getProductById` usa cache de alguns minutos. A alternativa documentada é checar o id no `proxy.ts`. Um produto alterado direto no banco leva alguns minutos para aparecer atualizado; a aplicação não edita produtos.
- **`404` e `401` no endpoint:** a spec não lista status codes; produto inexistente e falta de sessão recebem respostas próprias em vez de `500`/`400`.
- **Limite de 1000 caracteres no comentário:** a spec não define tamanho; o limite evita comentários abusivos e aparece no contador do formulário.
- **Só a FK do produto vira "Produto não encontrado":** a tabela tem duas FKs; a violação da FK do autor (conta removida com sessão ainda válida) não é confundida com produto inexistente e responde `401`.
- **Data absoluta em vez de relativa:** as avaliações mostram a data curta (`15 de nov. de 2026`) no fuso de São Paulo. Uma data relativa leria o relógio durante a renderização no servidor.
- **Imagem e link defensivos:** o cabeçalho só usa `next/image` com URLs `https` (as únicas liberadas no `next.config.ts`) e só renderiza "Ver na loja" para links `http(s)`; nos outros casos mostra o placeholder e omite o botão.
- **Título da aba estático** ("Detalhes do produto — Sistema de Avaliação de Produto"): um título com o nome do produto exigiria outra leitura dinâmica.
- **Uma avaliação por pessoa por produto:** a spec não restringe, mas a revisão de código pediu a regra; ela é garantida pelo índice único no banco e refletida no endpoint (`409`) e na página.
- **A lista mostra só as 50 avaliações mais recentes:** a spec pede "todos os comentários"; sem paginação, listar tudo não escala e a API corta em 1000 linhas. O resumo (contagem, média e distribuição) continua valendo para todas.
- **tRPC e Bun continuam fora**, como nas specs anteriores.
