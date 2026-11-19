-- Resumo das avaliações de um produto, gerado por IA. Fica guardado para o modelo
-- não ser chamado a cada visita: só é refeito quando a quantidade de avaliações muda.
create table public.products_ai_summaries (
  product_id text primary key references public.products (id) on delete cascade,
  summary text not null,
  -- Quantas avaliações o produto tinha quando o resumo foi gerado.
  feedbacks_count integer not null check (feedbacks_count > 0),
  model text not null,
  generated_at timestamptz not null default now()
);

alter table public.products_ai_summaries enable row level security;
-- Sem policies: apenas o service role (que ignora RLS) acessa a tabela via API.
