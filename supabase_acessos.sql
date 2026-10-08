-- Controle de acesso por usuário (CONFIGURAÇÕES › Geral › Acessos).
-- Rode uma vez no SQL Editor do Supabase. Pode ser executado de novo sem erro.
--
--   admin      → acesso total e gestão dos acessos dos demais usuários
--   bloqueios  → chaves dos módulos/abas/subabas retirados do usuário
--                (ex.: ["loa.ploa", "metricas.novo"]); vazio = acesso total

alter table public.usuarios add column if not exists admin boolean not null default false;
alter table public.usuarios add column if not exists bloqueios jsonb not null default '[]'::jsonb;

-- O usuário logado é administrador?
create or replace function public.usuario_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.usuarios
    where admin and lower(trim(email)) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

-- Ainda não há nenhum administrador? (mantém o app como antes até definir um)
create or replace function public.sem_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.usuarios where admin)
$$;

-- Todos continuam LENDO a lista de usuários (nome em "Registrado por" e
-- cálculo do próprio acesso); só administradores incluem, alteram e excluem.
drop policy if exists "usuarios_insert_autenticados" on public.usuarios;
drop policy if exists "usuarios_update_autenticados" on public.usuarios;
drop policy if exists "usuarios_delete_autenticados" on public.usuarios;
drop policy if exists "usuarios_insert_admin" on public.usuarios;
drop policy if exists "usuarios_update_admin" on public.usuarios;
drop policy if exists "usuarios_delete_admin" on public.usuarios;

create policy "usuarios_insert_admin" on public.usuarios for insert to authenticated
  with check (public.usuario_admin() or public.sem_admin());
create policy "usuarios_update_admin" on public.usuarios for update to authenticated
  using (public.usuario_admin() or public.sem_admin())
  with check (public.usuario_admin() or public.sem_admin());
create policy "usuarios_delete_admin" on public.usuarios for delete to authenticated
  using (public.usuario_admin() or public.sem_admin());

-- Primeiro administrador: troque pelo SEU e-mail de login (o mesmo cadastrado
-- em CONFIGURAÇÕES › Geral › Usuários) e rode esta linha.
-- update public.usuarios set admin = true where lower(trim(email)) = lower('seu.email@exemplo.com');
