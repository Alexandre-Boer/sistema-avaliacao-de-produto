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
- **Validação compartilhada:** `src/lib/validation/feedback.ts` (zod) é usado pelo formulário e pelo endpoint. Nota inteira de 1 a 5 (aceita `"5"` como string por `coerce`), comentário com `trim`, obrigatório e com no máximo 1000 caracteres.
- **Serviços:** `src/server/products/get-product.ts` (`getProductById`, `null` quando não existe), `src/server/feedbacks/list-feedbacks.ts` (avaliações do produto com nome do autor, mais recentes primeiro) e `src/server/feedbacks/create-feedback.ts` (id com nanoid; violação da FK do produto, `23503`, vira `ProductNotFoundError`).
- **Endpoint:** `POST /api/v1/products/<id>/feedbacks` (`src/app/api/v1/products/[id]/feedbacks/route.ts`) responde `401` sem sessão, `400` para JSON inválido ou schema rejeitado, `404` para produto inexistente, `201 { id }` no sucesso e `500` para erros inesperados. O autor (`created_by`) vem somente da sessão e o produto somente da URL.
- **Interface:** `/products/<id>` (`src/app/(site)/products/[id]/page.tsx`) busca produto, avaliações e sessão em paralelo e mostra, nesta ordem: cabeçalho do produto (imagem ou placeholder, nome, descrição, botão "Ver na loja"), lista de avaliações (contagem, nota média, distribuição das notas em barras, autor, estrelas, data e comentário) e o formulário de nova avaliação (pessoa logada) ou o bloco "Entre na sua conta para avaliar este produto." com os botões "Entrar" e "Criar conta" (pessoa deslogada). O formulário (react-hook-form + React Query) usa estrelas feitas com rádios nativos, contador de caracteres e, no `201`, limpa os campos e chama `router.refresh()` para a lista incluir a nova avaliação.
- **Carregamento e erro:** `loading.tsx` é o boundary de Suspense exigido pelo `cacheComponents` (esqueleto com a estrutura da página) e `not-found.tsx` mostra "Produto não encontrado".

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

### Decisões e desvios conscientes da spec
- **Página inexistente responde `200` com a tela de "não encontrado":** com `loading.tsx` a resposta começa a ser transmitida antes da consulta ao banco, então o status já foi enviado quando `notFound()` roda. O Next.js inclui `<meta name="robots" content="noindex">` nesse caso. O endpoint da API responde `404` de verdade. Um `404` real na página exigiria checar o id no `proxy.ts` ou abrir mão do esqueleto de carregamento.
- **`404` e `401` no endpoint:** a spec não lista status codes; produto inexistente e falta de sessão recebem respostas próprias em vez de `500`/`400`.
- **Limite de 1000 caracteres no comentário:** a spec não define tamanho; o limite evita comentários abusivos e aparece no contador do formulário.
- **Só a FK do produto vira "Produto não encontrado":** a tabela tem duas FKs; a violação da FK do autor (conta removida com sessão ainda válida) não é confundida com produto inexistente.
- **Data absoluta em vez de relativa:** as avaliações mostram a data curta (`15 de nov. de 2026`) no fuso de São Paulo. Uma data relativa leria o relógio durante a renderização no servidor.
- **Imagem e link defensivos:** o cabeçalho só usa `next/image` com URLs `https` (as únicas liberadas no `next.config.ts`) e só renderiza "Ver na loja" para links `http(s)`; nos outros casos mostra o placeholder e omite o botão.
- **Título da aba estático** ("Detalhes do produto — Sistema de Avaliação de Produto"): um título com o nome do produto exigiria outra leitura dinâmica.
- **Uma pessoa pode avaliar o mesmo produto mais de uma vez:** a spec não restringe.
- **tRPC e Bun continuam fora**, como nas specs anteriores.
