-- Tabela da aba "Conjuntura" (módulo CONHECIMENTO): um relatório por dia,
-- gerado pelo workflow conjuntura.yml (scripts/conjuntura.py) de segunda a
-- sexta às 08:00. O app só lê; quem grava é o workflow, com a chave
-- service_role (que ignora as políticas abaixo).
-- Execute no Supabase: painel do projeto > SQL Editor > New query > Run.
-- Idempotente e não destrutivo.

create table if not exists public.conjuntura_relatorios (
  data date primary key,
  gerado_em timestamptz not null default now(),
  status text not null default 'ok',     -- ok | erro
  conteudo jsonb,                         -- seções do relatório e fontes
  erro text,
  modelo text,
  candidatas int,
  usadas int
);
alter table public.conjuntura_relatorios enable row level security;

drop policy if exists "conjuntura_select" on public.conjuntura_relatorios;
create policy "conjuntura_select" on public.conjuntura_relatorios for select to authenticated using (true);

do $$ begin alter publication supabase_realtime add table public.conjuntura_relatorios; exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
