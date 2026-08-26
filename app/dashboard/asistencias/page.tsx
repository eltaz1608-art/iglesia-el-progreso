"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Perfil = {
  id: string;
  nombre: string;
  apellido: string;
};

type HistorialAsistencia = {
  id: string;
  fecha: string;
  tipo_culto: string;
  perfil_id: string;
  perfiles: {
    nombre: string;
    apellido: string;
  };
};

export default function AsistenciasPage() {
  const router = useRouter();
  const [miembros, setMiembros] = useState<Perfil[]>([]);
  const [historial, setHistorial] = useState<HistorialAsistencia[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Nivel de acceso
  const [userRol, setUserRol] = useState<string>("general");
  
  // Datos del formulario de asistencia
  const [fecha, setFecha] = useState("");
  const [tipoCulto, setTipoCulto] = useState("domingo");
  const [asistentes, setAsistentes] = useState<Set<string>>(new Set());
  const [mensaje, setMensaje] = useState("");

  // Datos para registrar nuevo miembro
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoApellido, setNuevoApellido] = useState("");
  const [mensajeMiembro, setMensajeMiembro] = useState("");

  // Filtro para consultar historial por fecha
  const [fechaConsulta, setFechaConsulta] = useState("");

  const obtenerDatos = async () => {
    const hoy = new Date().toISOString().split("T")[0];
    if (!fecha) setFecha(hoy);
    if (!fechaConsulta) setFechaConsulta(hoy);

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

    // 2. Obtener miembros
    const { data: dataMiembros } = await supabase
      .from("perfiles")
      .select("id, nombre, apellido")
      .order("nombre");

    if (dataMiembros) setMiembros(dataMiembros);

    // 3. Obtener historial de asistencias
    const { data: dataHistorial } = await supabase
      .from("asistencias")
      .select(`
        id,
        fecha,
        tipo_culto,
        perfil_id,
        perfiles (nombre, apellido)
      `)
      .order("fecha", { ascending: false });

    if (dataHistorial) setHistorial(dataHistorial as unknown as HistorialAsistencia[]);
    
    setCargando(false);
  };

  useEffect(() => {
    obtenerDatos();
  }, []);

  const agregarMiembro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevoApellido) {
      setMensajeMiembro("⚠️ Ingresa nombre y apellido.");
      return;
    }

    const { error } = await supabase.from("perfiles").insert({
      nombre: nuevoNombre,
      apellido: nuevoApellido,
      rol: "general",
    });

    if (error) {
      setMensajeMiembro("❌ Error al registrar.");
    } else {
      setMensajeMiembro("✅ ¡Miembro agregado!");
      setNuevoNombre("");
      setNuevoApellido("");
      obtenerDatos();
      setTimeout(() => setMensajeMiembro(""), 3000);
    }
  };

  const eliminarMiembro = async (id: string, nombreCompleto: string) => {
    if (confirm(`¿Estás seguro de dar de baja a ${nombreCompleto}?`)) {
      const { error } = await supabase.from("perfiles").delete().eq("id", id);
      if (error) {
        alert("No se pudo eliminar (tiene registros relacionados).");
      } else {
        obtenerDatos();
      }
    }
  };

  const toggleAsistencia = (id: string) => {
    const nuevosAsistentes = new Set(asistentes);
    if (nuevosAsistentes.has(id)) {
      nuevosAsistentes.delete(id);
    } else {
      nuevosAsistentes.add(id);
    }
    setAsistentes(nuevosAsistentes);
  };

  const guardarAsistencia = async () => {
    if (asistentes.size === 0) {
      setMensaje("⚠️ Selecciona al menos a una persona.");
      return;
    }

    setMensaje("Guardando...");

    const registros = Array.from(asistentes).map((id) => ({
      perfil_id: id,
      fecha: fecha,
      tipo_culto: tipoCulto,
      asistio: true,
    }));

    const { error } = await supabase.from("asistencias").insert(registros);

    if (error) {
      setMensaje("❌ Hubo un error al guardar.");
    } else {
      setMensaje("✅ ¡Asistencia guardada con éxito!");
      setAsistentes(new Set()); 
      obtenerDatos(); 
      setTimeout(() => setMensaje(""), 3000);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Cargando módulo...</p>
        </div>
      </div>
    );
  }

  const historialFiltrado = historial.filter((h) => h.fecha === fechaConsulta);
  const puedeEditar = ['pastor', 'lider_asistencia'].includes(userRol);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado Principal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
          <button 
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-blue-600 font-semibold flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {puedeEditar ? 'Asistencia y Miembros' : 'Historial de Asistencias'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestiona el registro de congregantes y visualiza el historial de los cultos.
            </p>
          </div>
        </div>

        {puedeEditar && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            
            {/* Columna Izquierda: Gestión de Miembros */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100 h-fit">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <span className="text-slate-600 text-lg">👥</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Directorio</h2>
              </div>
              
              {/* Formulario minimalista */}
              <form onSubmit={agregarMiembro} className="space-y-4 mb-8">
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    placeholder="Nombre" 
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400"
                  />
                  <input 
                    type="text" 
                    placeholder="Apellido" 
                    value={nuevoApellido}
                    onChange={(e) => setNuevoApellido(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-slate-900 shadow-sm transition-all flex justify-center items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar Miembro
                </button>
                {mensajeMiembro && (
                  <p className={`text-xs text-center font-semibold mt-2 ${mensajeMiembro.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                    {mensajeMiembro}
                  </p>
                )}
              </form>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Lista Actual ({miembros.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                  {miembros.map((m) => (
                    <div key={m.id} className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                      <span className="text-gray-800 font-semibold text-sm">{m.nombre} {m.apellido}</span>
                      <button 
                        onClick={() => eliminarMiembro(m.id, `${m.nombre} ${m.apellido}`)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold px-2.5 py-1.5 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                        title="Eliminar miembro"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                  {miembros.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-4 italic">No hay miembros registrados.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Columna Central/Derecha: Tomar Asistencia */}
            <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <span className="text-blue-600 text-lg">📝</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Tomar Asistencia</h2>
              </div>

              {/* Controles: Cuadrícula de 2 columnas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha del Culto</label>
                  <input 
                    type="date" 
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-medium text-gray-700 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Culto</label>
                  <select 
                    value={tipoCulto}
                    onChange={(e) => setTipoCulto(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-medium text-gray-700 transition-all appearance-none"
                  >
                    <option value="domingo">Domingo (Principal)</option>
                    <option value="martes">Martes</option>
                    <option value="jueves">Jueves</option>
                    <option value="sabado">Sábado</option>
                  </select>
                </div>
              </div>

              {/* Lista interactiva de miembros para marcar */}
              <div className="flex-grow mb-6 bg-slate-50 border border-gray-100 rounded-xl p-3 max-h-80 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {miembros.map((miembro) => {
                    const seleccionado = asistentes.has(miembro.id);
                    return (
                      <label 
                        key={miembro.id} 
                        className={`flex items-center p-3 rounded-lg cursor-pointer border-2 transition-all select-none
                          ${seleccionado 
                            ? 'border-blue-500 bg-blue-50 shadow-sm' 
                            : 'border-transparent bg-transparent hover:bg-white hover:border-blue-200 hover:shadow-sm'
                          }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={seleccionado}
                          onChange={() => toggleAsistencia(miembro.id)}
                          className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        />
                        <span className={`ml-3 text-sm transition-colors ${seleccionado ? 'font-bold text-blue-900' : 'font-medium text-gray-700'}`}>
                          {miembro.nombre} {miembro.apellido}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {miembros.length === 0 && (
                  <p className="text-gray-400 text-sm italic p-6 text-center">Registra miembros en el directorio primero.</p>
                )}
              </div>

              {/* Pie de controles de asistencia */}
              <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-gray-100 gap-4 mt-auto">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500">Personas seleccionadas:</span>
                  <span className="bg-blue-100 text-blue-700 font-extrabold text-lg px-3 py-1 rounded-lg">
                    {asistentes.size}
                  </span>
                </div>
                
                <div className="flex flex-col items-end w-full sm:w-auto">
                  <button 
                    onClick={guardarAsistencia}
                    className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 hover:shadow-lg focus:ring-4 focus:ring-blue-500/50 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar Asistencia
                  </button>
                  {mensaje && (
                    <p className={`mt-2 text-sm font-semibold w-full text-center sm:text-right ${mensaje.includes('✅') ? 'text-green-600' : 'text-amber-600'}`}>
                      {mensaje}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sección Inferior: Historial de Asistencias (Tabla) */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                <span className="text-indigo-600 text-lg">🗂️</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Historial Registrado</h2>
            </div>
            
            <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
              <svg className="w-5 h-5 text-gray-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input 
                type="date" 
                value={fechaConsulta}
                onChange={(e) => setFechaConsulta(e.target.value)}
                className="bg-transparent border-none text-sm font-medium text-gray-700 outline-none focus:ring-0 cursor-pointer"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Miembro Presente</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Culto</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {historialFiltrado.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                      {h.perfiles ? `${h.perfiles.nombre} ${h.perfiles.apellido}` : 'Desconocido'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 uppercase tracking-wide border border-blue-100">
                        {h.tipo_culto}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 font-medium">
                      {new Date(h.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
                {historialFiltrado.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-4xl mb-3">🍃</span>
                        <p className="text-gray-400 font-medium text-sm">No hay registros de asistencia para esta fecha.</p>
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
  );
}