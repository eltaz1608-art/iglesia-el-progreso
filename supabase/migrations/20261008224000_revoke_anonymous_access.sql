-- Contención inicial para el proyecto el-progreso-chms.
-- Las cinco tablas tenían todos los privilegios concedidos a anon y políticas
-- USING/WITH CHECK (true). No modifica datos ni acceso de authenticated.
begin;

revoke all on table
  public.perfiles,
  public.asistencias,
  public.visitas,
  public.cronograma_servicio,
  public.peticiones_oracion
from anon, public;

alter table public.perfiles enable row level security;

commit;
