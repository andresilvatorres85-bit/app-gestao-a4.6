-- Tabelas do módulo "CALENDÁRIO" (agenda compartilhada da A4.6).
-- Execute no Supabase: painel do projeto > SQL Editor > New query > Run.
-- Idempotente (pode rodar mais de uma vez) e NÃO apaga dados: preserva os
-- calendários e eventos já cadastrados. Rodar de novo só acrescenta o que
-- faltava (colunas de recorrência/exceções e a tabela de calendários).

-- ===== eventos =====
create table if not exists public.calendario_eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text,
  inicio timestamptz,
  fim timestamptz,
  dia_inteiro boolean not null default false,
  local text,
  descricao text,
  cor text default 'azul',
  recorrencia text default 'nao',
  excecoes jsonb not null default '[]'::jsonb,
  criado_por text,
  criado_em timestamptz not null default now()
);
-- para bancos criados nas versões anteriores (sem as colunas):
alter table public.calendario_eventos add column if not exists recorrencia text default 'nao';
alter table public.calendario_eventos add column if not exists excecoes jsonb not null default '[]'::jsonb;

alter table public.calendario_eventos enable row level security;

drop policy if exists "calendario_select_autenticados" on public.calendario_eventos;
create policy "calendario_select_autenticados"
  on public.calendario_eventos for select to authenticated using (true);
drop policy if exists "calendario_insert_autenticados" on public.calendario_eventos;
create policy "calendario_insert_autenticados"
  on public.calendario_eventos for insert to authenticated with check (true);
drop policy if exists "calendario_update_autenticados" on public.calendario_eventos;
create policy "calendario_update_autenticados"
  on public.calendario_eventos for update to authenticated using (true) with check (true);
drop policy if exists "calendario_delete_autenticados" on public.calendario_eventos;
create policy "calendario_delete_autenticados"
  on public.calendario_eventos for delete to authenticated using (true);

-- ===== calendários (lista compartilhada: criar/renomear/excluir) =====
-- NÃO recria a tabela (preserva os calendários personalizados). Só migra uma
-- versão legada muito antiga que não tenha a coluna "id".
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'calendario_agendas'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'calendario_agendas' and column_name = 'id'
  ) then
    drop table public.calendario_agendas cascade;
  end if;
end $$;

create table if not exists public.calendario_agendas (
  id text primary key,
  nome text,
  cor text,
  pos int default 0,
  criado_em timestamptz not null default now()
);
-- garante as colunas em tabelas já existentes:
alter table public.calendario_agendas add column if not exists nome text;
alter table public.calendario_agendas add column if not exists cor text;
alter table public.calendario_agendas add column if not exists pos int default 0;

alter table public.calendario_agendas enable row level security;

drop policy if exists "agendas_select_autenticados" on public.calendario_agendas;
create policy "agendas_select_autenticados"
  on public.calendario_agendas for select to authenticated using (true);
drop policy if exists "agendas_insert_autenticados" on public.calendario_agendas;
create policy "agendas_insert_autenticados"
  on public.calendario_agendas for insert to authenticated with check (true);
drop policy if exists "agendas_update_autenticados" on public.calendario_agendas;
create policy "agendas_update_autenticados"
  on public.calendario_agendas for update to authenticated using (true) with check (true);
drop policy if exists "agendas_delete_autenticados" on public.calendario_agendas;
create policy "agendas_delete_autenticados"
  on public.calendario_agendas for delete to authenticated using (true);

-- ===== realtime (o app escuta mudanças em tempo real) =====
-- Em blocos DO para não falhar se a tabela já estiver na publicação.
do $$ begin
  alter publication supabase_realtime add table public.calendario_eventos;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.calendario_agendas;
exception when duplicate_object then null; end $$;
