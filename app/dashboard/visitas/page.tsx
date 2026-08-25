"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Visita = {
  id: string;
  nombre: string;
  telefono: string;
  fecha_visita: string;
  contactado: boolean;
  perfiles?: {
    nombre: string;
    apellido: string;
  }[];
};

type Miembro = {
  id: string;
  nombre: string;
  apellido: string;
};

export default function VisitasPage() {
  const router = useRouter();
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargando, setCargando] = useState(true);

  // Nivel de acceso
  const [userRol, setUserRol] = useState<string>("general");

  // Formulario de nueva visita
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [invitadoPor, setInvitadoPor] = useState("");
  const [fechaVisita, setFechaVisita] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Filtro por fecha para el historial
  const [fechaFiltro, setFechaFiltro] = useState("");

  const cargarDatos = async () => {
    const hoy = new Date().toISOString().split("T")[0];
    setFechaVisita(hoy);
    if (!fechaFiltro) setFechaFiltro(hoy);

    // 1. Verificar Rol
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", session.user.id)
        .single();
      
      if (perfil) {
        setUserRol(perfil.rol);
      } else if (session.user.email === "admin@gmail.com") {
        setUserRol("pastor");
      }
    }

    // 2. Obtener miembros para el selector de "quién lo invitó"
    const { data: resMiembros } = await supabase
      .from("perfiles")
      .select("id, nombre, apellido")
      .order("nombre");
    if (resMiembros) setMiembros(resMiembros);

    // 3. Obtener lista de visitas registradas
    const { data: resVisitas } = await supabase
      .from("visitas")
      .select(`
        id,
        nombre,
        telefono,
        fecha_visita,
        contactado,
        perfiles (nombre, apellido)
      `)
      .order("fecha_visita", { ascending: false });

    if (resVisitas) setVisitas(resVisitas as unknown as Visita[]);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const registrarVisita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre) {
      setMensaje("⚠️ El nombre de la visita es obligatorio.");
      return;
    }

    setMensaje("Registrando...");

    const { error } = await supabase.from("visitas").insert({
      nombre,
      telefono,
      invitado_por: invitadoPor || null,
      fecha_visita: fechaVisita,
      contactado: false,
    });

    if (error) {
      setMensaje("❌ Error al registrar la visita.");
      console.error(error);
    } else {
      setMensaje("✅ ¡Visita registrada con éxito!");
      setNombre("");
      setTelefono("");
      setInvitadoPor("");
      cargarDatos(); 
      setTimeout(() => setMensaje(""), 3000);
    }
  };

  const toggleContactado = async (id: string, estadoActual: boolean) => {
    // Si no tiene permisos, no hace nada
    if (!['pastor', 'lider_asistencia'].includes(userRol)) return;

    const { error } = await supabase
      .from("visitas")
      .update({ contactado: !estadoActual })
      .eq("id", id);

    if (!error) {
      cargarDatos();
    }
  };

  const eliminarVisita = async (id: string, nombreVisita: string) => {
    if (confirm(`¿Estás seguro de eliminar el registro de ${nombreVisita}?`)) {
      const { error } = await supabase.from("visitas").delete().eq("id", id);
      if (error) {
        alert("Error al eliminar la visita.");
      } else {
        cargarDatos();
      }
    }
  };

  if (cargando) return <div className="p-8">Cargando módulo de visitas...</div>;

  const visitasFiltradas = visitas.filter((v) => v.fecha_visita === fechaFiltro);
  
  // Determina si el usuario tiene permisos para crear/editar visitas
  const puedeEditar = ['pastor', 'lider_asistencia'].includes(userRol);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.push("/dashboard")}
          className="text-gray-500 hover:text-blue-600 font-medium"
        >
          ← Volver al Panel
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {puedeEditar ? 'Módulo de Visitas e Invitados' : 'Historial de Visitas'}
        </h1>
      </div>

      <div className={`grid grid-cols-1 ${puedeEditar ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-8`}>
        
        {/* Formulario (Oculto para colaboradores y generales) */}
        {puedeEditar && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Nueva Visita</h2>
            
            <form onSubmit={registrarVisita} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Invitado</label>
                <input 
                  type="text" 
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Ana Martínez"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input 
                  type="text" 
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 987654321"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">¿Quién lo invitó?</label>
                <select 
                  value={invitadoPor}
                  onChange={(e) => setInvitadoPor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value="">-- Ninguno / Anónimo --</option>
                  {miembros.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} {m.apellido}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Visita</label>
                <input 
                  type="date" 
                  value={fechaVisita}
                  onChange={(e) => setFechaVisita(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm"
              >
                Registrar Invitado
              </button>
            </form>

            {mensaje && (
              <div className={`mt-4 p-3 rounded-lg text-center font-medium text-xs ${mensaje.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                {mensaje}
              </div>
            )}
          </div>
        )}

        {/* Tabla de Historial (Visible para todos, pero con botones limitados según el rol) */}
        <div className={`${puedeEditar ? 'lg:col-span-2' : ''} bg-white p-6 rounded-xl shadow-sm border border-gray-100`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-lg font-bold text-gray-900">Historial de Invitados</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Filtrar fecha:</label>
              <input 
                type="date" 
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(e.target.value)}
                className="px-2.5 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-xs text-gray-500 uppercase">
                  <th className="py-2 px-3">Nombre</th>
                  <th className="py-2 px-3">Teléfono</th>
                  <th className="py-2 px-3">Invitado por</th>
                  <th className="py-2 px-3">Fecha</th>
                  <th className="py-2 px-3 text-center">Seguimiento</th>
                  {puedeEditar && <th className="py-2 px-3 text-center">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {visitasFiltradas.map((v) => {
                  const nombrePerfil = v.perfiles && v.perfiles.length > 0 
                    ? `${v.perfiles[0].nombre} ${v.perfiles[0].apellido}` 
                    : "Ninguno";

                  return (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-800">{v.nombre}</td>
                      <td className="py-3 px-3 text-gray-600">{v.telefono || "S/N"}</td>
                      <td className="py-3 px-3 text-gray-600">{nombrePerfil}</td>
                      <td className="py-3 px-3 text-gray-500 text-xs">{v.fecha_visita}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleContactado(v.id, v.contactado)}
                          disabled={!puedeEditar}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            v.contactado 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-orange-100 text-orange-700'
                          } ${puedeEditar ? (v.contactado ? 'hover:bg-green-200 cursor-pointer' : 'hover:bg-orange-200 cursor-pointer') : 'cursor-default opacity-80'}`}
                        >
                          {v.contactado ? '✓ Contactado' : 'Pendiente'}
                        </button>
                      </td>
                      {puedeEditar && (
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => eliminarVisita(v.id, v.nombre)}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 bg-red-50 rounded transition-colors"
                            title="Eliminar invitado"
                          >
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {visitasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={puedeEditar ? 6 : 5} className="py-6 text-center text-gray-400 text-sm italic">
                      No hay visitas registradas para esta fecha.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}