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
      rol: "general", // Se asigna general por defecto a los miembros del directorio
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

  if (cargando) return <div className="p-8">Cargando módulo de asistencias...</div>;

  const historialFiltrado = historial.filter((h) => h.fecha === fechaConsulta);
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
          {puedeEditar ? 'Registro de Asistencia y Miembros' : 'Historial de Asistencias'}
        </h1>
      </div>

      {puedeEditar && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Columna Izquierda: Gestión de Miembros */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Directorio de Miembros</h2>
            
            <form onSubmit={agregarMiembro} className="space-y-3 mb-6">
              <p className="text-xs text-gray-500">Registrar nuevo miembro:</p>
              <input 
                type="text" 
                placeholder="Nombre" 
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input 
                type="text" 
                placeholder="Apellido" 
                value={nuevoApellido}
                onChange={(e) => setNuevoApellido(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                type="submit"
                className="w-full bg-gray-800 text-white py-2 rounded-lg text-sm font-semibold hover:bg-gray-900 transition-colors"
              >
                + Agregar Miembro
              </button>
              {mensajeMiembro && <p className="text-xs text-center font-medium mt-1">{mensajeMiembro}</p>}
            </form>

            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Lista Actual ({miembros.length}):</h3>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {miembros.map((m) => (
                  <div key={m.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg text-sm">
                    <span className="text-gray-700 font-medium">{m.nombre} {m.apellido}</span>
                    <button 
                      onClick={() => eliminarMiembro(m.id, `${m.nombre} ${m.apellido}`)}
                      className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 bg-red-50 rounded"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Tomar Asistencia */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del Culto</label>
                <input 
                  type="date" 
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Culto</label>
                <select 
                  value={tipoCulto}
                  onChange={(e) => setTipoCulto(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="domingo">Domingo (Principal)</option>
                  <option value="martes">Martes</option>
                  <option value="jueves">Jueves</option>
                  <option value="sabado">Sábado</option>
                </select>
              </div>
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Lista de Miembros</h2>
            
            <div className="space-y-2 max-h-72 overflow-y-auto mb-6 p-2 bg-gray-50 rounded-lg border">
              {miembros.map((miembro) => (
                <label key={miembro.id} className="flex items-center p-2.5 hover:bg-white rounded-lg cursor-pointer border border-transparent hover:border-gray-200 transition-all">
                  <input 
                    type="checkbox" 
                    checked={asistentes.has(miembro.id)}
                    onChange={() => toggleAsistencia(miembro.id)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-3 font-medium text-gray-700 text-sm">
                    {miembro.nombre} {miembro.apellido}
                  </span>
                </label>
              ))}
              {miembros.length === 0 && (
                <p className="text-gray-500 text-sm italic p-4 text-center">No hay miembros registrados aún.</p>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="font-medium text-sm text-gray-600">
                Seleccionados: <span className="text-blue-600 font-bold text-lg">{asistentes.size}</span>
              </p>
              <button 
                onClick={guardarAsistencia}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
              >
                Guardar Asistencia
              </button>
            </div>
            
            {mensaje && (
              <div className={`mt-4 p-3 rounded-lg text-center font-medium text-sm ${mensaje.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                {mensaje}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sección Inferior: Historial de Asistencias por Fecha (Visible para todos) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b pb-4">
          <h2 className="text-lg font-bold text-gray-900">Historial de Asistencias por Fecha</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Ver fecha:</label>
            <input 
              type="date" 
              value={fechaConsulta}
              onChange={(e) => setFechaConsulta(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase">
                <th className="py-2 px-3">Miembro Presente</th>
                <th className="py-2 px-3">Culto</th>
                <th className="py-2 px-3">Fecha Registrada</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {historialFiltrado.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-800">
                    {h.perfiles ? `${h.perfiles.nombre} ${h.perfiles.apellido}` : 'Desconocido'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded uppercase">
                      {h.tipo_culto}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gray-500 text-xs">{h.fecha}</td>
                </tr>
              ))}
              {historialFiltrado.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-gray-400 text-sm italic">
                    No hay registros de asistencia para esta fecha.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}