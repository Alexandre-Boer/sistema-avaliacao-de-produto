create table public.products (
  id text primary key,
  name text not null,
  description text,
  image_url text,
  external_link text not null,
  score boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ordenação estável da listagem paginada (mais recentes primeiro, id como desempate).
create index products_created_at_id_idx
  on public.products (created_at desc, id desc);

alter table public.products enable row level security;
-- Sem policies: apenas o service role (que ignora RLS) acessa a tabela via API.
