-- The existing perfiles table remains the member directory so its historical
-- foreign keys stay intact. accesos is the only source of application roles.
begin;

create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

create table if not exists public.accesos (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  miembro_id uuid unique references public.perfiles(id) on delete set null,
  rol text not null check (rol in (
    'pastor', 'lider_asistencia', 'lider_cronograma', 'colaborador', 'general'
  )),
  activo boolean not null default false,
  creado_en timestamptz not null default now()
);

comment on table public.accesos is
  'Cuentas autorizadas; separadas del directorio de miembros en perfiles.';
alter table public.accesos enable row level security;
revoke all on table public.accesos from public, anon, authenticated;
grant select on table public.accesos to authenticated;
grant update (rol, activo, miembro_id) on table public.accesos to authenticated;

-- One-time transfer of roles for accounts already linked to a member.
-- Unlinked accounts remain inactive until a pastor reviews them.
insert into public.accesos (usuario_id, miembro_id, rol, activo)
select
  u.id,
  p.id,
  case
    when lower(trim(p.rol)) in (
      'pastor', 'lider_asistencia', 'lider_cronograma', 'colaborador', 'general'
    ) then lower(trim(p.rol))
    else 'general'
  end,
  p.id is not null
from auth.users u
left join public.perfiles p on p.id = u.id
on conflict (usuario_id) do nothing;

do $$
begin
  if not exists (
    select 1 from public.accesos where rol = 'pastor' and activo
  ) then
    raise exception 'Migration requires at least one active pastor account';
  end if;
end
$$;

create or replace function app_private.current_role()
returns text
language sql stable security definer
set search_path = ''
as $$
  select a.rol
  from public.accesos a
  where a.usuario_id = (select auth.uid()) and a.activo
$$;

create or replace function app_private.current_member_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select a.miembro_id
  from public.accesos a
  where a.usuario_id = (select auth.uid()) and a.activo
$$;

revoke all on function app_private.current_role() from public, anon;
revoke all on function app_private.current_member_id() from public, anon;
grant execute on function app_private.current_role() to authenticated;
grant execute on function app_private.current_member_id() to authenticated;

-- New Auth accounts are visible to pastors but inactive until approved.
create or replace function app_private.create_inactive_access()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and auth.uid() <> new.id then
    raise exception 'Cannot provision access for another user';
  end if;
  insert into public.accesos (usuario_id, rol, activo)
  values (new.id, 'general', false)
  on conflict (usuario_id) do nothing;
  return new;
end
$$;

revoke all on function app_private.create_inactive_access() from public, anon, authenticated;
drop trigger if exists create_inactive_access_for_auth_user on auth.users;
create trigger create_inactive_access_for_auth_user
after insert on auth.users
for each row execute function app_private.create_inactive_access();

drop policy if exists "Permitir insercion de perfiles" on public.perfiles;
drop policy if exists "Permitir todo en perfiles" on public.perfiles;
drop policy if exists "Permitir update perfiles" on public.perfiles;
drop policy if exists "Permitir todo en asistencias" on public.asistencias;
drop policy if exists "Permitir todo en visitas" on public.visitas;
drop policy if exists "Permitir todo en cronograma" on public.cronograma_servicio;
drop policy if exists "Permitir todo en peticiones" on public.peticiones_oracion;
drop policy if exists "Own account or pastor can view access" on public.accesos;
drop policy if exists "Pastor can manage other accounts" on public.accesos;
drop policy if exists "Active accounts can read member directory" on public.perfiles;
drop policy if exists "Attendance leaders can add members" on public.perfiles;
drop policy if exists "Attendance leaders can remove members" on public.perfiles;
drop policy if exists "Attendance leaders can read attendance" on public.asistencias;
drop policy if exists "Attendance leaders can record attendance" on public.asistencias;
drop policy if exists "Attendance leaders can read visitors" on public.visitas;
drop policy if exists "Attendance leaders can add visitors" on public.visitas;
drop policy if exists "Attendance leaders can update visitors" on public.visitas;
drop policy if exists "Attendance leaders can delete visitors" on public.visitas;
drop policy if exists "Active accounts can read service schedule" on public.cronograma_servicio;
drop policy if exists "Schedule leaders can add services" on public.cronograma_servicio;
drop policy if exists "Schedule leaders can update services" on public.cronograma_servicio;
drop policy if exists "Schedule leaders can delete services" on public.cronograma_servicio;
drop policy if exists "Pastor or owner can read prayer requests" on public.peticiones_oracion;
drop policy if exists "Pastor or owner can add prayer requests" on public.peticiones_oracion;
drop policy if exists "Pastor can update prayer requests" on public.peticiones_oracion;

alter table public.perfiles enable row level security;
alter table public.asistencias enable row level security;
alter table public.visitas enable row level security;
alter table public.cronograma_servicio enable row level security;
alter table public.peticiones_oracion enable row level security;

revoke all on table
  public.perfiles, public.asistencias, public.visitas,
  public.cronograma_servicio, public.peticiones_oracion
from public, anon, authenticated;

-- SELECT is column-scoped to keep member phone and birth date private.
-- rol is temporarily included for the still-deployed application; it is no
-- longer authoritative and can be removed after the new app is deployed.
grant select (id, nombre, apellido, rol) on public.perfiles to authenticated;
grant insert (nombre, apellido, rol) on public.perfiles to authenticated;

grant select, insert on public.asistencias to authenticated;
grant select, insert, delete on public.visitas to authenticated;
grant update (contactado) on public.visitas to authenticated;
grant select, insert, delete on public.cronograma_servicio to authenticated;
grant update (predicador_id, director_alabanza_id)
  on public.cronograma_servicio to authenticated;
grant select, insert on public.peticiones_oracion to authenticated;
grant update (estado) on public.peticiones_oracion to authenticated;

create policy "Own account or pastor can view access"
on public.accesos for select to authenticated
using (
  usuario_id = (select auth.uid())
  or (select app_private.current_role()) = 'pastor'
);

create policy "Pastor can manage other accounts"
on public.accesos for update to authenticated
using (
  (select app_private.current_role()) = 'pastor'
  and usuario_id <> (select auth.uid())
)
with check (
  (select app_private.current_role()) = 'pastor'
  and usuario_id <> (select auth.uid())
);

create policy "Active accounts can read member directory"
on public.perfiles for select to authenticated
using ((select app_private.current_role()) is not null);

create policy "Attendance leaders can add members"
on public.perfiles for insert to authenticated
with check ((select app_private.current_role()) in ('pastor', 'lider_asistencia'));

create policy "Attendance leaders can read attendance"
on public.asistencias for select to authenticated
using ((select app_private.current_role()) in ('pastor', 'lider_asistencia'));

create policy "Attendance leaders can record attendance"
on public.asistencias for insert to authenticated
with check ((select app_private.current_role()) in ('pastor', 'lider_asistencia'));

create policy "Attendance leaders can read visitors"
on public.visitas for select to authenticated
using ((select app_private.current_role()) in ('pastor', 'lider_asistencia'));

create policy "Attendance leaders can add visitors"
on public.visitas for insert to authenticated
with check ((select app_private.current_role()) in ('pastor', 'lider_asistencia'));

create policy "Attendance leaders can update visitors"
on public.visitas for update to authenticated
using ((select app_private.current_role()) in ('pastor', 'lider_asistencia'))
with check ((select app_private.current_role()) in ('pastor', 'lider_asistencia'));

create policy "Attendance leaders can delete visitors"
on public.visitas for delete to authenticated
using ((select app_private.current_role()) in ('pastor', 'lider_asistencia'));

create policy "Active accounts can read service schedule"
on public.cronograma_servicio for select to authenticated
using ((select app_private.current_role()) is not null);

create policy "Schedule leaders can add services"
on public.cronograma_servicio for insert to authenticated
with check ((select app_private.current_role()) in ('pastor', 'lider_cronograma'));

create policy "Schedule leaders can update services"
on public.cronograma_servicio for update to authenticated
using ((select app_private.current_role()) in ('pastor', 'lider_cronograma'))
with check ((select app_private.current_role()) in ('pastor', 'lider_cronograma'));

create policy "Schedule leaders can delete services"
on public.cronograma_servicio for delete to authenticated
using ((select app_private.current_role()) in ('pastor', 'lider_cronograma'));

create policy "Pastor or owner can read prayer requests"
on public.peticiones_oracion for select to authenticated
using (
  (select app_private.current_role()) = 'pastor'
  or perfil_id = (select app_private.current_member_id())
);

create policy "Pastor or owner can add prayer requests"
on public.peticiones_oracion for insert to authenticated
with check (
  (select app_private.current_role()) = 'pastor'
  or (
    (select app_private.current_member_id()) is not null
    and perfil_id = (select app_private.current_member_id())
  )
);

create policy "Pastor can update prayer requests"
on public.peticiones_oracion for update to authenticated
using ((select app_private.current_role()) = 'pastor')
with check ((select app_private.current_role()) = 'pastor');

commit;
