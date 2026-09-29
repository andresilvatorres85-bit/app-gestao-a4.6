-- Tabela do módulo "CALENDÁRIO" (agenda compartilhada da A4.6).
-- Execute no Supabase: painel do projeto > SQL Editor > New query > Run.
-- Idempotente (pode rodar mais de uma vez) e não apaga dados.

create table if not exists public.calendario_eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text,
  inicio timestamptz,
  fim timestamptz,
  dia_inteiro boolean not null default false,
  local text,
  descricao text,
  cor text default 'azul',
  criado_por text,
  criado_em timestamptz not null default now()
);

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

-- Realtime (o app escuta mudanças em tempo real):
alter publication supabase_realtime add table public.calendario_eventos;
