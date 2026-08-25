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

  if (cargando) return <div className="p-8">Cargando cronograma...</div>;

  // Determina si el usuario tiene permisos para crear/editar el cronograma
  const puedeEditar = ['pastor', 'lider_cronograma'].includes(userRol);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.push("/dashboard")}
          className="text-gray-500 hover:text-purple-600 font-medium"
        >
          ← Volver al Panel
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {puedeEditar ? 'Cronograma de Servicios' : 'Visualización de Cronograma'}
        </h1>
      </div>

      <div className={`grid grid-cols-1 ${puedeEditar ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-8`}>
        
        {/* Formulario (Oculto para colaboradores y generales) */}
        {puedeEditar && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Programar Culto</h2>
            
            <form onSubmit={registrarTurno} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del Culto</label>
                <input 
                  type="date" 
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Culto</label>
                <select 
                  value={tipoCulto}
                  onChange={(e) => setTipoCulto(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  <option value="domingo">Domingo (Principal)</option>
                  <option value="martes">Martes</option>
                  <option value="jueves">Jueves</option>
                  <option value="sabado">Sábado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📖 Predicador</label>
                <select 
                  value={predicadorId}
                  onChange={(e) => setPredicadorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  <option value="">-- Sin asignar --</option>
                  {miembros.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🎵 Director de Alabanza</label>
                <select 
                  value={directorId}
                  onChange={(e) => setDirectorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  <option value="">-- Sin asignar --</option>
                  {miembros.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">👨‍🏫 Maestros (Selecciona uno o varios)</label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1 bg-gray-50">
                  {miembros.map((m) => (
                    <label key={m.id} className="flex items-center p-1.5 hover:bg-white rounded cursor-pointer text-xs">
                      <input 
                        type="checkbox"
                        checked={maestrosSeleccionados.has(m.id)}
                        onChange={() => toggleMaestroSeleccionado(m.id)}
                        className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                      />
                      <span className="ml-2 font-medium text-gray-700">{m.nombre} {m.apellido}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors text-sm"
              >
                Guardar en el Cronograma
              </button>
            </form>

            {mensaje && (
              <div className={`mt-4 p-3 rounded-lg text-center font-medium text-xs ${mensaje.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                {mensaje}
              </div>
            )}
          </div>
        )}

        {/* Lista de próximos turnos */}
        <div className={`${puedeEditar ? 'lg:col-span-2' : ''} bg-white p-6 rounded-xl shadow-sm border border-gray-100`}>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Próximos Turnos Asignados</h2>
          
          <div className={`grid grid-cols-1 ${!puedeEditar && cronogramas.length > 0 ? 'sm:grid-cols-2 gap-4' : 'space-y-4'}`}>
            {cronogramas.map((c) => (
              <div key={c.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase">
                      {c.tipo_culto}
                    </span>
                    <span className="text-gray-600 text-sm font-semibold">{c.fecha}</span>
                  </div>
                  {puedeEditar && (
                    <button
                      onClick={() => eliminarTurno(c.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 bg-red-50 rounded"
                    >
                      Eliminar Culto
                    </button>
                  )}
                </div>

                <div className={`grid grid-cols-1 gap-3 text-sm ${puedeEditar ? 'sm:grid-cols-3' : 'sm:grid-cols-1'}`}>
                  {/* Predicador */}
                  <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-xs">
                    <p className="font-semibold text-gray-700 text-xs mb-1">📖 Predica:</p>
                    <p className="text-gray-900 font-medium mb-2">
                      {c.predicador ? `${c.predicador.nombre} ${c.predicador.apellido}` : 'Sin asignar'}
                    </p>
                    {puedeEditar && (
                      <select
                        onChange={(e) => actualizarEncargado(c.id, 'predicador_id', e.target.value || null)}
                        defaultValue=""
                        className="w-full text-xs px-2 py-1 border rounded bg-gray-50 outline-none"
                      >
                        <option value="" disabled>Modificar / Reemplazar</option>
                        <option value="">-- Quitar encargado --</option>
                        {miembros.map((m) => (
                          <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Director de Alabanza */}
                  <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-xs">
                    <p className="font-semibold text-gray-700 text-xs mb-1">🎵 Alabanza:</p>
                    <p className="text-gray-900 font-medium mb-2">
                      {c.director_alabanza ? `${c.director_alabanza.nombre} ${c.director_alabanza.apellido}` : 'Sin asignar'}
                    </p>
                    {puedeEditar && (
                      <select
                        onChange={(e) => actualizarEncargado(c.id, 'director_alabanza_id', e.target.value || null)}
                        defaultValue=""
                        className="w-full text-xs px-2 py-1 border rounded bg-gray-50 outline-none"
                      >
                        <option value="" disabled>Modificar / Reemplazar</option>
                        <option value="">-- Quitar encargado --</option>
                        {miembros.map((m) => (
                          <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Maestros */}
                  <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-xs">
                    <p className="font-semibold text-gray-700 text-xs mb-1">👨‍🏫 Maestros:</p>
                    <div className="text-gray-900 font-medium mb-2 text-xs space-y-0.5">
                      {c.maestros && c.maestros.length > 0 ? (
                        c.maestros.map((m, idx) => (
                          <div key={idx}>• {m.nombre} {m.apellido}</div>
                        ))
                      ) : (
                        <span className="text-gray-400 italic">Sin maestros</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {cronogramas.length === 0 && (
            <p className="text-gray-400 text-sm italic text-center py-8">
              No hay turnos programados todavía.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}