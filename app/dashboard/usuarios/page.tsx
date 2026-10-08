"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAccess } from "@/lib/access-context";
import { roles, type Role } from "@/lib/access";

type Cuenta = {
  usuario_id: string;
  miembro_id: string | null;
  rol: Role;
  activo: boolean;
  nombre: string;
};

type Miembro = { id: string; nombre: string; apellido: string | null };

async function obtenerDatos(): Promise<{ cuentas: Cuenta[]; miembros: Miembro[] }> {
  const [accesos, perfiles] = await Promise.all([
    supabase.from("accesos").select("usuario_id, miembro_id, rol, activo").order("rol"),
    supabase.from("perfiles").select("id, nombre, apellido"),
  ]);
  if (accesos.error || perfiles.error) throw new Error("No se pudo cargar la gestión de accesos.");

  const nombres = new Map(
    (perfiles.data ?? []).map((perfil) => [
      perfil.id,
      [perfil.nombre, perfil.apellido].filter(Boolean).join(" "),
    ]),
  );
  return {
    cuentas: (accesos.data ?? []).map((cuenta) => ({
      ...cuenta,
      nombre: nombres.get(cuenta.miembro_id) ?? `Cuenta ${cuenta.usuario_id.slice(0, 8)}`,
    })),
    miembros: (perfiles.data ?? []) as Miembro[],
  };
}

export default function UsuariosPage() {
  const router = useRouter();
  const { userId } = useAccess();
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState("");

  const cargarUsuarios = async () => {
    try {
      const datos = await obtenerDatos();
      setCuentas(datos.cuentas);
      setMiembros(datos.miembros);
      setError("");
    } catch {
      setError("No se pudo cargar la gestión de accesos.");
    }
    setCargando(false);
  };

  useEffect(() => {
    obtenerDatos()
      .then((datos) => {
        setCuentas(datos.cuentas);
        setMiembros(datos.miembros);
        setError("");
      })
      .catch(() => setError("No se pudo cargar la gestión de accesos."))
      .finally(() => setCargando(false));
  }, []);

  const actualizar = async (id: string, cambios: { rol?: Role; activo?: boolean; miembro_id?: string | null }) => {
    if (id === userId) return;
    setOcupado(id);
    setError("");
    const { error: updateError } = await supabase
      .from("accesos")
      .update(cambios)
      .eq("usuario_id", id)
      .select("usuario_id")
      .single();
    if (updateError) {
      setError("No se pudo actualizar el acceso.");
    } else {
      await cargarUsuarios();
    }
    setOcupado(null);
  };

  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center">Cargando accesos...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => router.push("/dashboard")} className="mb-6 text-blue-700 font-semibold">
          ← Volver al panel
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Accesos y roles</h1>
        <p className="mt-2 mb-6 text-sm text-gray-600">
          Desactivar una cuenta bloquea el acceso al sistema sin borrar al miembro ni su historial.
          Las cuentas nuevas se crean en Supabase y aparecen desactivadas hasta que un pastor las habilite.
          Puedes vincular una cuenta con un miembro existente para identificarla y asignarle sus peticiones.
        </p>
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        <div className="space-y-3">
          {cuentas.map((cuenta) => (
            <div key={cuenta.usuario_id} className="rounded-xl border border-gray-200 bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div className="mb-3 sm:mb-0">
                <p className="font-semibold text-gray-900">{cuenta.nombre}</p>
                <p className="text-xs text-gray-500">{cuenta.activo ? "Acceso activo" : "Acceso desactivado"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm text-gray-600">
                  Miembro
                  <select
                    value={cuenta.miembro_id ?? ""}
                    onChange={(event) => void actualizar(cuenta.usuario_id, { miembro_id: event.target.value || null })}
                    disabled={cuenta.usuario_id === userId || ocupado === cuenta.usuario_id}
                    className="ml-2 max-w-48 rounded-lg border border-gray-300 bg-white px-2 py-2 text-gray-900 disabled:opacity-50"
                  >
                    <option value="">Sin vínculo</option>
                    {miembros
                      .filter((miembro) => miembro.id === cuenta.miembro_id || !cuentas.some((otra) => otra.miembro_id === miembro.id))
                      .map((miembro) => (
                        <option key={miembro.id} value={miembro.id}>
                          {[miembro.nombre, miembro.apellido].filter(Boolean).join(" ")}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="text-sm text-gray-600">
                  Rol
                  <select
                    value={cuenta.rol}
                    onChange={(event) => void actualizar(cuenta.usuario_id, { rol: event.target.value as Role })}
                    disabled={cuenta.usuario_id === userId || ocupado === cuenta.usuario_id}
                    className="ml-2 rounded-lg border border-gray-300 bg-white px-2 py-2 text-gray-900 disabled:opacity-50"
                  >
                    {roles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => void actualizar(cuenta.usuario_id, { activo: !cuenta.activo })}
                  disabled={cuenta.usuario_id === userId || ocupado === cuenta.usuario_id}
                  className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50"
                >
                  {cuenta.activo ? "Desactivar" : "Reactivar"}
                </button>
              </div>
            </div>
          ))}
          {cuentas.length === 0 && <p className="rounded-xl bg-white p-8 text-center text-gray-500">No hay cuentas vinculadas.</p>}
        </div>
      </div>
    </main>
  );
}
