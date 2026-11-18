-- Tabela do módulo "CALENDÁRIO": notas em checklist (estilo Google Keep).
-- Duas listas compartilhadas pela A4.6: "pendencias" e "briefing".
-- Execute no Supabase: painel do projeto > SQL Editor > New query > Run.
-- Idempotente (pode rodar mais de uma vez) e não apaga dados.

create table if not exists public.checklist_itens (
  id uuid primary key default gen_random_uuid(),
  lista text not null default 'pendencias',   -- 'pendencias' | 'briefing'
  texto text not null default '',
  feito boolean not null default false,
  pos int not null default 0,                  -- posição (segundos) para ordenar
  criado_por text,
  criado_em timestamptz not null default now()
);

alter table public.checklist_itens enable row level security;

drop policy if exists "checklist_select_autenticados" on public.checklist_itens;
create policy "checklist_select_autenticados"
  on public.checklist_itens for select to authenticated using (true);
drop policy if exists "checklist_insert_autenticados" on public.checklist_itens;
create policy "checklist_insert_autenticados"
  on public.checklist_itens for insert to authenticated with check (true);
drop policy if exists "checklist_update_autenticados" on public.checklist_itens;
create policy "checklist_update_autenticados"
  on public.checklist_itens for update to authenticated using (true) with check (true);
drop policy if exists "checklist_delete_autenticados" on public.checklist_itens;
create policy "checklist_delete_autenticados"
  on public.checklist_itens for delete to authenticated using (true);

-- Data de conclusão: o app mostra os itens concluídos só nos últimos 10 dias.
-- Preenchida pelo próprio banco ao marcar/desmarcar "feito". Itens que já
-- estavam concluídos recebem a data de hoje (ficam visíveis por mais 10 dias).
alter table public.checklist_itens add column if not exists feito_em timestamptz;
update public.checklist_itens set feito_em = now() where feito and feito_em is null;

create or replace function public.checklist_marca_feito_em() returns trigger
language plpgsql as $$
begin
  if new.feito and (tg_op = 'INSERT' or not old.feito) then
    new.feito_em := now();
  elsif not new.feito then
    new.feito_em := null;
  end if;
  return new;
end $$;

drop trigger if exists checklist_feito_em on public.checklist_itens;
create trigger checklist_feito_em before insert or update of feito on public.checklist_itens
  for each row execute function public.checklist_marca_feito_em();

-- realtime (o app escuta mudanças em tempo real).
-- Em bloco DO para não falhar se a tabela já estiver na publicação.
do $$ begin
  alter publication supabase_realtime add table public.checklist_itens;
exception when duplicate_object then null; end $$;
