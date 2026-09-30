-- Tabelas do módulo "CONHECIMENTO" (abas "Recebimento Função" e "Contatos").
-- Execute no Supabase: painel do projeto > SQL Editor > New query > Run.
-- Idempotente e não destrutivo.

-- ===== Recebimento Função: atividades e subatividades (compartilhadas) =====
create table if not exists public.recebimento_atividades (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.recebimento_atividades(id) on delete cascade,
  texto text not null default '',
  pos int not null default 0,
  criado_por text,
  criado_em timestamptz not null default now()
);
alter table public.recebimento_atividades enable row level security;

drop policy if exists "atv_select" on public.recebimento_atividades;
create policy "atv_select" on public.recebimento_atividades for select to authenticated using (true);
drop policy if exists "atv_insert" on public.recebimento_atividades;
create policy "atv_insert" on public.recebimento_atividades for insert to authenticated with check (true);
drop policy if exists "atv_update" on public.recebimento_atividades;
create policy "atv_update" on public.recebimento_atividades for update to authenticated using (true) with check (true);
drop policy if exists "atv_delete" on public.recebimento_atividades;
create policy "atv_delete" on public.recebimento_atividades for delete to authenticated using (true);

-- ===== Recebimento Função: marcações POR USUÁRIO (cada um vê só as suas) =====
create table if not exists public.recebimento_check (
  atividade_id uuid not null references public.recebimento_atividades(id) on delete cascade,
  user_email text not null,
  criado_em timestamptz not null default now(),
  primary key (atividade_id, user_email)
);
alter table public.recebimento_check enable row level security;

-- cada usuário só enxerga/edita as próprias marcações (por e-mail do token).
drop policy if exists "check_select_meu" on public.recebimento_check;
create policy "check_select_meu" on public.recebimento_check for select to authenticated using (user_email = auth.email());
drop policy if exists "check_insert_meu" on public.recebimento_check;
create policy "check_insert_meu" on public.recebimento_check for insert to authenticated with check (user_email = auth.email());
drop policy if exists "check_delete_meu" on public.recebimento_check;
create policy "check_delete_meu" on public.recebimento_check for delete to authenticated using (user_email = auth.email());

-- ===== Contatos (agenda compartilhada) =====
create table if not exists public.contatos (
  id uuid primary key default gen_random_uuid(),
  grupo text not null default 'outros',
  dados jsonb not null default '{}'::jsonb,
  criado_por text,
  criado_em timestamptz not null default now()
);
alter table public.contatos enable row level security;

drop policy if exists "contatos_select" on public.contatos;
create policy "contatos_select" on public.contatos for select to authenticated using (true);
drop policy if exists "contatos_insert" on public.contatos;
create policy "contatos_insert" on public.contatos for insert to authenticated with check (true);
drop policy if exists "contatos_update" on public.contatos;
create policy "contatos_update" on public.contatos for update to authenticated using (true) with check (true);
drop policy if exists "contatos_delete" on public.contatos;
create policy "contatos_delete" on public.contatos for delete to authenticated using (true);

-- ===== realtime =====
do $$ begin alter publication supabase_realtime add table public.recebimento_atividades; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.recebimento_check; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.contatos; exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
