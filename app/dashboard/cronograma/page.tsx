"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Turno = {
  id: string;
  fecha: string;
  tipo_culto: string;
  predicador?: { id: string; nombre: string; apellido: string };
  director_alabanza?: { id: string; nombre: string; apellido: string };
  maestros?: { id: string; nombre: string; apellido: string }[];
};

type Miembro = {
  id: string;
  nombre: string;
  apellido: string;
};

export default function CronogramaPage() {
  const router = useRouter();
  const [cronogramas, setCronogramas] = useState<Turno[]>([]);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargando, setCargando] = useState(true);

  // Nivel de acceso
  const [userRol, setUserRol] = useState<string>("general");

  // Formulario
  const [fecha, setFecha] = useState("");
  const [tipoCulto, setTipoCulto] = useState("domingo");
  const [predicadorId, setPredicadorId] = useState("");
  const [directorId, setDirectorId] = useState("");
  const [maestrosSeleccionados, setMaestrosSeleccionados] = useState<Set<string>>(new Set());
  const [mensaje, setMensaje] = useState("");

  const cargarDatos = async () => {
    const hoy = new Date().toISOString().split("T")[0];
    if (!fecha) setFecha(hoy);

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

    // 2. Cargar miembros para los selectores
    const { data: resMiembros } = await supabase
      .from("perfiles")
      .select("id, nombre, apellido")
      .order("nombre");
    if (resMiembros) setMiembros(resMiembros);

    // 3. Cargar cronograma con nombres de los perfiles relacionados
    const { data: resTurnos } = await supabase
      .from("cronograma_servicio")
      .select(`
        id,
        fecha,
        tipo_culto,
        predicador:predicador_id(id, nombre, apellido),
        director_alabanza:director_alabanza_id(id, nombre, apellido),
        maestros_ids
      `)
      .order("fecha", { ascending: true });

    if (resTurnos) {
      // Mapear los IDs de maestros a sus objetos reales buscando en miembros
      const turnosMapeados = resTurnos.map((t: any) => {
        const listaMaestros = (t.maestros_ids || []).map((mId: string) => 
          resMiembros?.find((miembro) => miembro.id === mId)
        ).filter(Boolean);

        return {
          ...t,
          maestros: listaMaestros
        };
      });
      setCronogramas(turnosMapeados);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const toggleMaestroSeleccionado = (id: string) => {
    const nuevos = new Set(maestrosSeleccionados);
    if (nuevos.has(id)) {
      nuevos.delete(id);
    } else {
      nuevos.add(id);
    }
    setMaestrosSeleccionados(nuevos);
  };

  const registrarTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("Guardando turnos...");

    const { error } = await supabase.from("cronograma_servicio").insert({
      fecha,
      tipo_culto: tipoCulto,
      predicador_id: predicadorId || null,
      director_alabanza_id: directorId || null,
      maestros_ids: Array.from(maestrosSeleccionados),
    });

    if (error) {
      setMensaje("❌ Error al programar el culto.");
      console.error(error);
    } else {
      setMensaje("✅ ¡Culto programado con éxito!");
      setPredicadorId("");
      setDirectorId("");
      setMaestrosSeleccionados(new Set());
      cargarDatos();
      setTimeout(() => setMensaje(""), 3000);
    }
  };

  const actualizarEncargado = async (turnoId: string, campo: 'predicador_id' | 'director_alabanza_id', nuevoId: string | null) => {
    // Protección adicional por si acaso
    if (!['pastor', 'lider_cronograma'].includes(userRol)) return;

    const { error } = await supabase
      .from("cronograma_servicio")
      .update({ [campo]: nuevoId })
      .eq("id", turnoId);

    if (!error) {
      cargarDatos();
    }
  };

  const eliminarTurno = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este culto del cronograma?")) {
      const { error } = await supabase.from("cronograma_servicio").delete().eq("id", id);
      if (!error) cargarDatos();
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Cargando cronograma...</p>
        </div>
      </div>
    );
  }

  // Determina si el usuario tiene permisos para crear/editar el cronograma
  const puedeEditar = ['pastor', 'lider_cronograma'].includes(userRol);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado Principal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
          <button 
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-purple-600 font-semibold flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {puedeEditar ? 'Cronograma de Servicios' : 'Visualización de Cronograma'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Organiza a los predicadores, directores de alabanza y maestros para cada servicio.
            </p>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${puedeEditar ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-8`}>
          
          {/* Formulario (Lateral) */}
          {puedeEditar && (
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100 h-fit">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                  <span className="text-purple-600 text-lg">📅</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Programar Culto</h2>
              </div>
              
              <form onSubmit={registrarTurno} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha del Culto</label>
                  <input 
                    type="date" 
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all text-sm font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo de Culto</label>
                  <select 
                    value={tipoCulto}
                    onChange={(e) => setTipoCulto(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all text-sm font-medium"
                  >
                    <option value="domingo">Domingo (Principal)</option>
                    <option value="martes">Martes</option>
                    <option value="jueves">Jueves</option>
                    <option value="sabado">Sábado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">📖 Predicador</label>
                  <select 
                    value={predicadorId}
                    onChange={(e) => setPredicadorId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all text-sm"
                  >
                    <option value="">-- Sin asignar --</option>
                    {miembros.map((m) => (
                      <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">🎵 Director de Alabanza</label>
                  <select 
                    value={directorId}
                    onChange={(e) => setDirectorId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all text-sm"
                  >
                    <option value="">-- Sin asignar --</option>
                    {miembros.map((m) => (
                      <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">👨‍🏫 Maestros (Selecciona varios)</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1 bg-gray-50 scrollbar-thin">
                    {miembros.map((m) => (
                      <label key={m.id} className="flex items-center p-2 hover:bg-white rounded-md cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                        <input 
                          type="checkbox"
                          checked={maestrosSeleccionados.has(m.id)}
                          onChange={() => toggleMaestroSeleccionado(m.id)}
                          className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                        />
                        <span className={`ml-2 text-sm ${maestrosSeleccionados.has(m.id) ? 'font-bold text-purple-700' : 'font-medium text-gray-700'}`}>
                          {m.nombre} {m.apellido}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-purple-700 hover:shadow-lg focus:ring-4 focus:ring-purple-500/50 transition-all text-sm flex justify-center items-center gap-2 mt-4"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Guardar en el Cronograma
                </button>
              </form>

              {mensaje && (
                <div className={`mt-4 p-3 rounded-lg text-center font-semibold text-xs border ${mensaje.includes('✅') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                  {mensaje}
                </div>
              )}
            </div>
          )}

          {/* Lista Principal de Próximos Turnos */}
          <div className={`${puedeEditar ? 'lg:col-span-2' : ''} bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100`}>
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                <span className="text-slate-600 text-lg">📌</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Próximos Turnos Asignados</h2>
            </div>
            
            <div className="space-y-6">
              {cronogramas.map((c) => (
                <div key={c.id} className="p-5 border border-gray-100 rounded-xl bg-slate-50 shadow-sm transition-all hover:shadow-md">
                  
                  {/* Encabezado del Turno */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-3 mb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-purple-100 text-purple-700 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wide border border-purple-200">
                        {c.tipo_culto}
                      </span>
                      <span className="text-gray-700 text-sm font-semibold capitalize">
                        {new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    {puedeEditar && (
                      <button
                        onClick={() => eliminarTurno(c.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-colors flex items-center gap-1.5"
                        title="Eliminar culto del cronograma"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                    )}
                  </div>

                  {/* 3 Sub-tarjetas Blancas: Predica, Alabanza, Maestros */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Predicador */}
                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="text-base">📖</span> Predica
                        </p>
                        <p className="text-gray-900 font-semibold text-sm mb-3">
                          {c.predicador ? `${c.predicador.nombre} ${c.predicador.apellido}` : <span className="text-gray-400 italic font-normal">Sin asignar</span>}
                        </p>
                      </div>
                      {puedeEditar && (
                        <select
                          onChange={(e) => actualizarEncargado(c.id, 'predicador_id', e.target.value || null)}
                          defaultValue=""
                          className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md bg-gray-50 text-gray-600 outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                        >
                          <option value="" disabled>Reemplazar...</option>
                          <option value="">-- Quitar --</option>
                          {miembros.map((m) => (
                            <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Director de Alabanza */}
                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="text-base">🎵</span> Alabanza
                        </p>
                        <p className="text-gray-900 font-semibold text-sm mb-3">
                          {c.director_alabanza ? `${c.director_alabanza.nombre} ${c.director_alabanza.apellido}` : <span className="text-gray-400 italic font-normal">Sin asignar</span>}
                        </p>
                      </div>
                      {puedeEditar && (
                        <select
                          onChange={(e) => actualizarEncargado(c.id, 'director_alabanza_id', e.target.value || null)}
                          defaultValue=""
                          className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md bg-gray-50 text-gray-600 outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                        >
                          <option value="" disabled>Reemplazar...</option>
                          <option value="">-- Quitar --</option>
                          {miembros.map((m) => (
                            <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Maestros */}
                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-start">
                      <p className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="text-base">👨‍🏫</span> Maestros
                      </p>
                      <div className="text-gray-800 font-medium text-sm space-y-1">
                        {c.maestros && c.maestros.length > 0 ? (
                          c.maestros.map((m, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                              {m.nombre} {m.apellido}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-400 italic font-normal">Sin maestros</span>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {cronogramas.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-5xl mb-4 text-gray-300">📆</span>
                <h3 className="text-lg font-semibold text-gray-700">No hay cultos programados</h3>
                <p className="text-gray-400 text-sm mt-1">Utiliza el formulario para agendar el próximo servicio.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}