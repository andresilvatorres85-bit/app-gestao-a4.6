-- Tabela do módulo "CONHECIMENTO" > aba "Rotina Asse Orç" (tarefas e
-- subtarefas por atividade do Assessor de Orçamento). Compartilhada.
-- Execute no Supabase: painel do projeto > SQL Editor > New query > Run.
-- Idempotente e não destrutivo.

create table if not exists public.rotina_itens (
  id uuid primary key default gen_random_uuid(),
  card text not null,                -- atividade (ppa, pldo, ploa, …)
  parent_id uuid references public.rotina_itens(id) on delete cascade,
  texto text not null default '',
  pos int not null default 0,
  criado_por text,
  criado_em timestamptz not null default now()
);
alter table public.rotina_itens enable row level security;

drop policy if exists "rotina_select" on public.rotina_itens;
create policy "rotina_select" on public.rotina_itens for select to authenticated using (true);
drop policy if exists "rotina_insert" on public.rotina_itens;
create policy "rotina_insert" on public.rotina_itens for insert to authenticated with check (true);
drop policy if exists "rotina_update" on public.rotina_itens;
create policy "rotina_update" on public.rotina_itens for update to authenticated using (true) with check (true);
drop policy if exists "rotina_delete" on public.rotina_itens;
create policy "rotina_delete" on public.rotina_itens for delete to authenticated using (true);

do $$ begin
  alter publication supabase_realtime add table public.rotina_itens;
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
