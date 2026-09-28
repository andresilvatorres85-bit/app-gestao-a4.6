-- Corrige a EDIÇÃO (UPDATE) nas tabelas "objeto_emendas" e "proposicoes".
-- Sintoma: adicionar registros funciona, mas editar não salva — porque as
-- tabelas tinham RLS com políticas de SELECT/INSERT/DELETE, sem UPDATE, então
-- o banco bloqueava silenciosamente a alteração.
--
-- Execute este script inteiro no Supabase: painel do projeto > SQL Editor >
-- New query > Run. É idempotente (pode rodar mais de uma vez sem problema) e
-- não apaga nenhum dado — apenas (re)cria as políticas de acesso.

-- ========== objeto_emendas (Alteração de emenda / Objeto Emenda) ==========
alter table public.objeto_emendas enable row level security;

drop policy if exists "objeto_emendas_select_autenticados" on public.objeto_emendas;
create policy "objeto_emendas_select_autenticados"
  on public.objeto_emendas for select to authenticated using (true);

drop policy if exists "objeto_emendas_insert_autenticados" on public.objeto_emendas;
create policy "objeto_emendas_insert_autenticados"
  on public.objeto_emendas for insert to authenticated with check (true);

drop policy if exists "objeto_emendas_update_autenticados" on public.objeto_emendas;
create policy "objeto_emendas_update_autenticados"
  on public.objeto_emendas for update to authenticated using (true) with check (true);

drop policy if exists "objeto_emendas_delete_autenticados" on public.objeto_emendas;
create policy "objeto_emendas_delete_autenticados"
  on public.objeto_emendas for delete to authenticated using (true);

-- ========== proposicoes (Proposições legislativas) ==========
alter table public.proposicoes enable row level security;

drop policy if exists "proposicoes_select_autenticados" on public.proposicoes;
create policy "proposicoes_select_autenticados"
  on public.proposicoes for select to authenticated using (true);

drop policy if exists "proposicoes_insert_autenticados" on public.proposicoes;
create policy "proposicoes_insert_autenticados"
  on public.proposicoes for insert to authenticated with check (true);

drop policy if exists "proposicoes_update_autenticados" on public.proposicoes;
create policy "proposicoes_update_autenticados"
  on public.proposicoes for update to authenticated using (true) with check (true);

drop policy if exists "proposicoes_delete_autenticados" on public.proposicoes;
create policy "proposicoes_delete_autenticados"
  on public.proposicoes for delete to authenticated using (true);
