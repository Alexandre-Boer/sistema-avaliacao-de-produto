create table public.products_feedbacks (
  id text primary key,
  score integer not null check (score between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now(),
  created_by text not null references public.accounts (id),
  product_id text not null references public.products (id) on delete cascade
);

-- Lista as avaliações de um produto, das mais recentes para as mais antigas.
create index products_feedbacks_product_id_created_at_idx
  on public.products_feedbacks (product_id, created_at desc);

-- Índice da chave estrangeira do autor (evita varredura completa em joins e deletes).
create index products_feedbacks_created_by_idx
  on public.products_feedbacks (created_by);

alter table public.products_feedbacks enable row level security;
-- Sem policies: apenas o service role (que ignora RLS) acessa a tabela via API.
