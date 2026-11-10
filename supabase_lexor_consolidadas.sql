-- Execute este script no Supabase: painel do projeto > SQL Editor > New query > Run.
--
-- ========== PROPOSTAS CONSOLIDADORAS DO MÓDULO LEXOR ==========
-- Guarda as propostas criadas pelo botão "Juntar propostas", que reúnem várias
-- propostas da mesma ação orçamentária num único espelho. A numeração começa em
-- 20279000 para não colidir com a numeração da planilha Controle_LEXOR.
--
-- A coluna "propostas" guarda apenas os números de origem; os dados (valores,
-- beneficiários, objetos) são remontados pelo aplicativo a partir da planilha,
-- de modo que uma atualização do Controle_LEXOR se reflete nas consolidadoras.

create table if not exists public.lexor_consolidadas (
  nr text primary key,                       -- '20279000', '20279001', …
  acao text not null,                        -- ação orçamentária comum às propostas
  propostas jsonb not null,                  -- ["20270032","20270044|NOME DO PARLAMENTAR"]
                                             -- (nr|PARLAMENTAR quando a proposta tem mais de um autor)
  parlamentar text,                          -- autor único da consolidadora
  partido text,
  criado_por text,
  criado_em timestamptz not null default now()
);

alter table public.lexor_consolidadas enable row level security;

create policy "lexor_consolidadas_select_autenticados"
  on public.lexor_consolidadas for select to authenticated using (true);
create policy "lexor_consolidadas_insert_autenticados"
  on public.lexor_consolidadas for insert to authenticated with check (true);
create policy "lexor_consolidadas_update_autenticados"
  on public.lexor_consolidadas for update to authenticated using (true) with check (true);
create policy "lexor_consolidadas_delete_autenticados"
  on public.lexor_consolidadas for delete to authenticated using (true);
