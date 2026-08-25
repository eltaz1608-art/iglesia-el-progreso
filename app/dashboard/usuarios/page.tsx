"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type UsuarioSistema = {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
};

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarUsuarios = async () => {
    const { data } = await supabase
      .from("perfiles")
      .select("id, nombre, apellido, rol")
      .order("nombre");
    if (data) setUsuarios(data);
    setCargando(false);
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const eliminarUsuario = async (id: string, nombreCompleto: string) => {
    if (confirm(`¿Estás seguro de quitarle el acceso a ${nombreCompleto}?`)) {
      const { error } = await supabase.from("perfiles").delete().eq("id", id);
      if (!error) cargarUsuarios();
    }
  };

  if (cargando) return <div className="p-8">Cargando gestión de usuarios...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.push("/dashboard")}
          className="text-gray-500 hover:text-blue-600 font-medium"
        >
          ← Volver al Panel
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Accesos y Roles</h1>
      </div>

      {/* Lista de Usuarios (Ancho completo) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
          <h2 className="text-lg font-bold text-gray-900">Usuarios Activos en el Sistema</h2>
          <p className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-md">
            Nota: Para crear un nuevo usuario, hazlo desde tu panel de Supabase.
          </p>
        </div>
        
        <div className="space-y-3">
          {usuarios.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No hay usuarios registrados.</p>
          ) : (
            usuarios.map((u) => (
              <div key={u.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border">
                <div>
                  <p className="font-semibold text-gray-800">{u.nombre || "Sin Nombre"} {u.apellido || ""}</p>
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase mt-1 inline-block">
                    {u.rol || "sin_rol"}
                  </span>
                </div>
                <button
                  onClick={() => eliminarUsuario(u.id, `${u.nombre} ${u.apellido}`)}
                  className="text-red-600 hover:text-white border border-red-200 hover:bg-red-500 text-sm font-semibold px-4 py-1.5 rounded transition-colors"
                >
                  Eliminar Acceso
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}