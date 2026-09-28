-- Garante que a tabela public.proposicoes tem TODAS as colunas que o app usa.
-- Sintoma que isto corrige: ao editar/adicionar uma proposição o app falha com
--   "Could not find the 'relator' column of 'proposicoes' in the schema cache"
-- porque a tabela foi criada antes de a coluna "Relator" ser adicionada à tela.
--
-- Rode no Supabase: SQL Editor > New query > Run. É idempotente (só cria o que
-- faltar) e não apaga nada.

alter table public.proposicoes add column if not exists proposicao text;
alter table public.proposicoes add column if not exists tipo text;
alter table public.proposicoes add column if not exists casa text;
alter table public.proposicoes add column if not exists ementa text;
alter table public.proposicoes add column if not exists autor text;
alter table public.proposicoes add column if not exists relator text;
alter table public.proposicoes add column if not exists impacto text;
alter table public.proposicoes add column if not exists tramitacao text;
alter table public.proposicoes add column if not exists atuacao text;
alter table public.proposicoes add column if not exists percepcao text;
alter table public.proposicoes add column if not exists status text;
alter table public.proposicoes add column if not exists assessor text;
alter table public.proposicoes add column if not exists link text;
alter table public.proposicoes add column if not exists posicao int;
alter table public.proposicoes add column if not exists criado_em timestamptz default now();

-- Recarrega o cache de esquema do PostgREST (o app usa a API REST do Supabase).
notify pgrst, 'reload schema';
