-- Coluna para guardar os campos do documento "Mudança de Ação Orçamentária (AO)"
-- na tabela objeto_emendas (módulo MÉTRICAS > Alteração emenda).
-- Execute no Supabase: painel do projeto > SQL Editor > New query > Run.
-- Idempotente e não destrutivo.

alter table public.objeto_emendas
  add column if not exists ao_dados jsonb;

-- Recarrega o cache do schema do PostgREST (evita "Could not find the 'ao_dados'
-- column ... in the schema cache" logo após criar a coluna).
notify pgrst, 'reload schema';
