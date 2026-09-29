-- Tabelas do módulo "CALENDÁRIO" (agenda compartilhada da A4.6).
-- Execute no Supabase: painel do projeto > SQL Editor > New query > Run.
-- Idempotente (pode rodar mais de uma vez) e não apaga dados. Se você já rodou
-- a versão anterior, rodar de novo apenas acrescenta o que faltava (a coluna
-- de recorrência e a tabela de calendários).

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
  criado_por text,
  criado_em timestamptz not null default now()
);
-- para bancos criados na versão anterior (sem a coluna):
alter table public.calendario_eventos add column if not exists recorrencia text default 'nao';

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
-- Recriada com o novo formato (id, nome, cor, pos). A tabela só guarda os
-- rótulos/cores dos calendários (não os eventos), então recriá-la não perde
-- compromissos. O app semeia os calendários padrão na primeira execução.
drop table if exists public.calendario_agendas cascade;
create table public.calendario_agendas (
  id text primary key,
  nome text,
  cor text,
  pos int default 0,
  criado_em timestamptz not null default now()
);

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
-- Ignore erro "already member of publication" se aparecer.
alter publication supabase_realtime add table public.calendario_eventos;
alter publication supabase_realtime add table public.calendario_agendas;
