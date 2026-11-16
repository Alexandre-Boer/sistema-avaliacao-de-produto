-- Tentativas de login que falharam, usadas para limitar tentativas de senha por e-mail.
-- O e-mail é guardado mesmo quando não existe conta, para o limite não revelar
-- quais e-mails estão cadastrados.
create table public.sign_in_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz not null default now()
);

create index sign_in_attempts_email_created_at_idx
  on public.sign_in_attempts (email, created_at desc);

alter table public.sign_in_attempts enable row level security;
-- Sem policies: apenas o service role (que ignora RLS) acessa a tabela via API.
