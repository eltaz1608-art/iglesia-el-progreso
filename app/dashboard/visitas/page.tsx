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
  perfiles?: any; // Cambiado a 'any' para evitar problemas de tipos en Vercel
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

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Cargando módulo...</p>
        </div>
      </div>
    );
  }

  const visitasFiltradas = visitas.filter((v) => v.fecha_visita === fechaFiltro);
  
  // Determina si el usuario tiene permisos para crear/editar visitas
  const puedeEditar = ['pastor', 'lider_asistencia'].includes(userRol);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado Principal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
          <button 
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-green-600 font-semibold flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {puedeEditar ? 'Visitas e Invitados' : 'Historial de Visitas'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Registra nuevas visitas y gestiona el seguimiento de invitados.
            </p>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${puedeEditar ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-8`}>
          
          {/* Formulario (Oculto para colaboradores y generales) */}
          {puedeEditar && (
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100 h-fit">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                  <span className="text-green-600 text-lg">👋</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Nueva Visita</h2>
              </div>
              
              <form onSubmit={registrarVisita} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre del Invitado</label>
                  <input 
                    type="text" 
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Ana Martínez"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-green-500 transition-all text-sm placeholder-gray-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Teléfono</label>
                  <input 
                    type="text" 
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej. 987654321"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-green-500 transition-all text-sm placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">¿Quién lo invitó?</label>
                  <select 
                    value={invitadoPor}
                    onChange={(e) => setInvitadoPor(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-green-500 transition-all text-sm"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha de Visita</label>
                  <input 
                    type="date" 
                    value={fechaVisita}
                    onChange={(e) => setFechaVisita(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-green-500 transition-all text-sm"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-green-700 hover:shadow-lg focus:ring-4 focus:ring-green-500/50 transition-all text-sm flex justify-center items-center gap-2 mt-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Registrar Invitado
                </button>
              </form>

              {mensaje && (
                <div className={`mt-4 p-3 rounded-lg text-center font-semibold text-xs ${mensaje.includes('✅') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'}`}>
                  {mensaje}
                </div>
              )}
            </div>
          )}

          {/* Tabla de Historial */}
          <div className={`${puedeEditar ? 'lg:col-span-2' : ''} bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                  <span className="text-gray-600 text-lg">🗂️</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Historial de Invitados</h2>
              </div>
              
              <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
                <svg className="w-5 h-5 text-gray-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input 
                  type="date" 
                  value={fechaFiltro}
                  onChange={(e) => setFechaFiltro(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium text-gray-700 outline-none focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Teléfono</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Invitado por</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Seguimiento</th>
                    {puedeEditar && <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {visitasFiltradas.map((v) => {
                    
                    // Lógica para extraer el nombre del invitador
                    let nombrePerfil = "Ninguno";
                    if (v.perfiles) {
                      if (Array.isArray(v.perfiles) && v.perfiles.length > 0) {
                        nombrePerfil = `${v.perfiles[0].nombre} ${v.perfiles[0].apellido}`;
                      } else if (!Array.isArray(v.perfiles) && v.perfiles.nombre) {
                        nombrePerfil = `${v.perfiles.nombre} ${v.perfiles.apellido}`;
                      }
                    }

                    return (
                      <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-gray-800">{v.nombre}</td>
                        <td className="py-3.5 px-4 text-gray-600 font-medium">{v.telefono || "S/N"}</td>
                        {/* Invitador en azul fuerte */}
                        <td className="py-3.5 px-4 text-blue-700 font-semibold">{nombrePerfil}</td>
                        <td className="py-3.5 px-4 text-gray-500 text-xs font-medium">{v.fecha_visita}</td>
                        
                        {/* Badges de seguimiento */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => toggleContactado(v.id, v.contactado)}
                            disabled={!puedeEditar}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border transition-all ${
                              v.contactado 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                            } ${puedeEditar ? (v.contactado ? 'hover:bg-green-100 cursor-pointer shadow-sm' : 'hover:bg-orange-100 cursor-pointer shadow-sm') : 'cursor-default opacity-80'}`}
                          >
                            {v.contactado ? '✓ Contactado' : '⏳ Pendiente'}
                          </button>
                        </td>
                        
                        {puedeEditar && (
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => eliminarVisita(v.id, v.nombre)}
                              className="text-red-500 hover:text-red-700 text-xs font-bold px-2.5 py-1.5 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                              title="Eliminar invitado"
                            >
                              Eliminar
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  
                  {/* Empty State */}
                  {visitasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={puedeEditar ? 6 : 5} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-4xl mb-3 text-gray-300">👋</span>
                          <p className="text-gray-400 font-medium text-sm">No hay visitas registradas para esta fecha.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}