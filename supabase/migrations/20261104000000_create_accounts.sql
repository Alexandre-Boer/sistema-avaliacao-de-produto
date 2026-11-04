create table public.accounts (
  id text primary key,
  first_name text not null,
  last_name text not null,
  email text not null,
  password text not null,
  salt text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index accounts_email_key on public.accounts (email);

alter table public.accounts enable row level security;
-- Sem policies: apenas o service role (que ignora RLS) acessa a tabela via API.
