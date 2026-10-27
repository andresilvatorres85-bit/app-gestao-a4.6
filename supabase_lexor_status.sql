-- Execute este script no Supabase: painel do projeto > SQL Editor > New query > Run.
--
-- ========== STATUS DE TRAMITAÇÃO DAS PROPOSTAS NO LEXOR ==========
-- Guarda a coluna "LEXOR" da tabela geral do módulo LEXOR, editada à mão e
-- salva automaticamente. A chave é o Nr Proposta da planilha Controle_LEXOR.
-- As propostas sem registro aqui são tratadas pelo aplicativo como
-- "Aguardando", que é o status padrão.
-- Quando a mesma proposta aparece para mais de um parlamentar, cada linha tem
-- o seu status e a chave é "nr|PARLAMENTAR" (ex.: '20270683|ALEX SANTANA').
-- Não é preciso alterar a tabela para isso.

create table if not exists public.lexor_status (
  nr text primary key,                       -- Nr Proposta (ex.: '20270032')
  status text not null,                      -- 'Aguardando' | 'Confeccionado' | 'Exportado'
  atualizado_por text,                       -- e-mail de quem alterou por último
  atualizado_em timestamptz not null default now()
);

alter table public.lexor_status enable row level security;

create policy "lexor_status_select_autenticados"
  on public.lexor_status for select to authenticated using (true);
create policy "lexor_status_insert_autenticados"
  on public.lexor_status for insert to authenticated with check (true);
create policy "lexor_status_update_autenticados"
  on public.lexor_status for update to authenticated using (true) with check (true);
create policy "lexor_status_delete_autenticados"
  on public.lexor_status for delete to authenticated using (true);
