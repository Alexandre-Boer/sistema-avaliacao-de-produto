# Home

## Escopo
Front-End, Back-End, Banco de Dados

## Contexto
Precisamos impementação o fluxo para listagem de produtos

## Requisitos funcionais
1. A home deve listar todos os produtos de forma paginada com infinite lading (scrolling)
   1. Cada produto deve mostrar o titulo, imagem e uma descrição simples
2. Precisamos criar uma nova conta no banco de dados na tabela de `products`
   1. `id`: nanoid (gerado com `nanoid` na camada de API)
   2. `name`: text
   3. `description`: text (opcional)
   4. `created_at`: timestamp
   5. `updated_at`: timestamp
   6. `score`: boolean
   7. `external_link`: text
3. A requisição deve ser um `GET` para `/api/v1/products`
4. Caso tudo dê certo retornar `200` ou array vazio
5. Ao cliar no nome de um produto devemos navegar para os detalhes do mesmo (iremos construir essa pagina em breve)

## Requisitos não funcionais
- UI/UX: Boa experiência de uso através de uma interface bonita, elegante, moderna
- Performance: O processo de criação de conta precisa ser rápido

## Você deve
- Criar um endpoint novo para listar todos os produtos
- Enriquecer a home existente ou criar uma nova pagina
- Criar a tabela no banco de dados
- Criar uma nova migration do Supabase
- Crier um endpoint para manualmente inserir novos produtos (POST `/products` com name, external_link e imagem)

## Você não deve
- Implementar qualquer outra funcionalidade que não esteja relacionada com sign-up (criação de contas).
- Não vamos realizar nenhum envio de email no momento, apenas processar a requisição, salvar no banco dados e tornar um sucesso.

## Tecnologias (Stack)
React.js, Next.js, React-Hook-Form, Shadcn, Tailwild, Supabase, TRCP, Bunjs.

## Critérios de aceitação
- Pagina home listando todos os produtos existentes

## Resultado
Pessoas conseguem ver os produtos de forma publica, sem autenticação.

Listagem pública de produtos implementada de ponta a ponta e verificada contra o projeto Supabase `sistema-avaliacao-produtos` em 15/11/2026.

### O que foi construído
- **Banco de dados:** a tabela `public.products` vem da migração `supabase/migrations/20261113000000_create_products.sql` (Fase 0 da orquestração): colunas da spec mais `image_url`, índice `(created_at desc, id desc)` e RLS habilitado sem policies (somente o service role acessa).
- **Validação:** `src/lib/validation/product.ts` (zod) tem o schema de criação (`name` obrigatório, `description` opcional, `externalLink` e `imageUrl` como URLs completas) e o schema da query de listagem (`limit` de 1 a 50, padrão 12; `offset` a partir de 0), que converte os textos da query string em números.
- **Serviços:** `src/server/products/list-products.ts` lê uma página ordenada por `created_at desc, id desc` e pede uma linha a mais que o `limit` para saber se existe próxima página (`nextOffset` vira `null` na última). `src/server/products/create-product.ts` gera o `id` com nanoid e insere o produto. Ambos usam o client server-side com service role.
- **Endpoints:** `GET /api/v1/products?limit=&offset=` responde `200 { items, nextOffset }` (lista vazia quando não há produtos), `400` para parâmetros inválidos e `500` para erros inesperados. `POST /api/v1/products` recebe `name`, `description?`, `externalLink` e `imageUrl` e responde `201 { id }`, `400` para JSON inválido ou schema rejeitado e `500` para erros inesperados.
- **Interface:** a home (`src/app/(site)/page.tsx`) busca a primeira página no servidor, dentro de `<Suspense>` com esqueleto, e entrega ao `ProductFeed` (`src/components/products/product-feed.tsx`), que continua a listagem no cliente com `useInfiniteQuery`. Um sentinela observado por `IntersectionObserver` carrega a próxima página quando o fim da grade se aproxima; o botão "Carregar mais" faz o mesmo para quem navega por teclado. Há estados de carregamento, lista vazia, erro com "Tentar novamente" e fim da lista ("Você viu todos os produtos").
- **Card:** `src/components/products/product-card.tsx` mostra imagem 4:3 (`next/image`) ou um placeholder com as barras da marca, o nome como link para `/products/<id>`, a descrição em até duas linhas (ou "Sem descrição") e o link "Ver na loja" em nova aba.

### Verificação
- `npm test`: 73 testes em 13 arquivos, todos passando (36 desta feature: 8 de validação, 7 de serviços, 11 dos endpoints e 10 do feed).
- `npx biome check .`: sem erros.
- `npm run build`: sucesso; `/` gerada como Partial Prerender (casca estática + produtos em streaming) e `/api/v1/products` como rota dinâmica.
- Por HTTP, com o servidor de desenvolvimento e 15 produtos de exemplo inseridos via `POST /api/v1/products` (todos `201`):
  - `GET /api/v1/products` → `200`, 12 itens, `nextOffset: 12`; `?limit=12&offset=12` → `200`, 3 itens, `nextOffset: null`; 15 ids distintos somando as duas páginas, do mais recente para o mais antigo.
  - `?limit=abc`, `?limit=1000` e `?offset=-1` → `400`.
  - `POST` com `externalLink` sem protocolo, sem `name` ou com corpo que não é JSON → `400`.
  - `GET /` → `200`; o HTML traz os 12 produtos mais recentes (12 `<h3>`, links `/products/<id>`, "Sem descrição" no produto sem descrição) e o botão "Carregar mais"; os 3 mais antigos ficam para a segunda página.
  - As imagens passam pelo otimizador (`/_next/image` → `200 image/jpeg`).
- O scroll infinito no navegador (rolar, carregar os 3 restantes e ver "Você viu todos os produtos") está coberto pelos testes do `ProductFeed` com `IntersectionObserver` simulado; a conferência visual fica para a etapa de integração.
- Clicar no nome leva a `/products/<id>`, que responde `404` neste branch: a página de detalhes é entregue pela feature Feedback.

### Decisões e desvios conscientes da spec
- **Coluna `image_url`:** a spec lista as colunas sem imagem, mas exige mostrar a imagem e recebê-la no `POST`.
- **`score boolean` mantido** como a spec descreve, com `default false`. Parece um engano da spec (talvez numérico), mas nada depende dele por enquanto.
- **Paginação por `offset`/`limit`:** simples e suficiente para o volume do projeto. Se um produto for inserido enquanto a pessoa rola a lista, um item pode se repetir na página seguinte; paginação por cursor resolveria e fica para quando houver necessidade.
- **`POST /api/v1/products` sem autenticação** e em `/api/v1/products` (a spec escreve `POST /products`), seguindo o padrão `/api/v1` do projeto. Proteger o endpoint fica para uma spec futura.
- **Primeira página renderizada no servidor:** além do `GET` pedido pela spec, a home já entrega os 12 primeiros produtos no HTML, o que evita uma tela só de esqueleto e uma requisição extra. As páginas seguintes usam o endpoint.
- **`imageUrl` obrigatória no `POST`**, embora a coluna aceite nulo: produtos antigos ou inseridos direto no banco sem imagem aparecem com placeholder.
- **Stack:** tRPC continua adiado (a spec fixa o path REST) e Bun não foi adotado (o projeto usa npm).
- **Dados de exemplo:** os 15 produtos inseridos usam imagens de `picsum.photos` e links ilustrativos de lojas e fabricantes.
