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

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Cargando gestión de usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado Principal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
          <button 
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-blue-600 font-semibold flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al Panel
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Gestión de Accesos y Roles
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Administra los permisos de los usuarios registrados en el sistema.
            </p>
          </div>
        </div>

        {/* Tarjeta Principal */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <span className="text-blue-600 text-lg">🛡️</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Usuarios Activos en el Sistema</h2>
            </div>
            
            {/* Nota Informativa (Badge Suave) */}
            <div className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Para crear cuentas, hazlo desde Supabase.
            </div>
          </div>
          
          <div className="space-y-3">
            {usuarios.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl mb-2 inline-block">👤</span>
                <p className="text-sm text-gray-400 font-medium">No hay usuarios registrados.</p>
              </div>
            ) : (
              usuarios.map((u) => (
                <div key={u.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200/60 hover:bg-white hover:border-gray-300 transition-all shadow-2xs">
                  <div className="space-y-1">
                    <p className="font-bold text-gray-800 text-base">
                      {u.nombre || "Sin Nombre"} {u.apellido || ""}
                    </p>
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-wider inline-block">
                      {u.rol || "sin_rol"}
                    </span>
                  </div>

                  <button
                    onClick={() => eliminarUsuario(u.id, `${u.nombre} ${u.apellido}`)}
                    className="text-red-600 hover:text-white border border-red-200 bg-white hover:bg-red-600 text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-2xs cursor-pointer"
                  >
                    Eliminar Acceso
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}