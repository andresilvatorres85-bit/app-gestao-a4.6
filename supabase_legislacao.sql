-- Tabela do módulo "CONHECIMENTO" > aba "Legislação" (base compartilhada da A4.6).
-- Execute no Supabase: painel do projeto > SQL Editor > New query > Run.
-- Idempotente e não destrutivo. O app semeia a base inicial (planilha) na
-- primeira execução, quando a tabela estiver vazia.

create table if not exists public.legislacao (
  id uuid primary key default gen_random_uuid(),
  secao text,
  nome text,
  url text,
  descricao text,
  pos int not null default 0,
  criado_por text,
  criado_em timestamptz not null default now()
);

alter table public.legislacao enable row level security;

drop policy if exists "legislacao_select_autenticados" on public.legislacao;
create policy "legislacao_select_autenticados"
  on public.legislacao for select to authenticated using (true);
drop policy if exists "legislacao_insert_autenticados" on public.legislacao;
create policy "legislacao_insert_autenticados"
  on public.legislacao for insert to authenticated with check (true);
drop policy if exists "legislacao_update_autenticados" on public.legislacao;
create policy "legislacao_update_autenticados"
  on public.legislacao for update to authenticated using (true) with check (true);
drop policy if exists "legislacao_delete_autenticados" on public.legislacao;
create policy "legislacao_delete_autenticados"
  on public.legislacao for delete to authenticated using (true);

-- realtime (o app escuta mudanças em tempo real).
do $$ begin
  alter publication supabase_realtime add table public.legislacao;
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
