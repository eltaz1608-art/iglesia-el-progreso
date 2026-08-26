"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Peticion = {
  id: string;
  motivo: string;
  estado: string;
  fecha: string;
  perfiles?: {
    nombre: string;
    apellido: string;
  };
};

type Miembro = {
  id: string;
  nombre: string;
  apellido: string;
};

export default function OracionesPage() {
  const router = useRouter();
  const [peticiones, setPeticiones] = useState<Peticion[]>([]);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargando, setCargando] = useState(true);

  // Formulario
  const [perfilId, setPerfilId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarDatos = async () => {
    // Cargar miembros para elegir quién pide oración
    const { data: resMiembros } = await supabase
      .from("perfiles")
      .select("id, nombre, apellido")
      .order("nombre");
    if (resMiembros) setMiembros(resMiembros);

    // Cargar peticiones de oración
    const { data: resOraciones } = await supabase
      .from("peticiones_oracion")
      .select(`
        id,
        motivo,
        estado,
        fecha,
        perfiles (nombre, apellido)
      `)
      .order("creado_en", { ascending: false });

    if (resOraciones) setPeticiones(resOraciones as unknown as Peticion[]);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const registrarPeticion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo || !perfilId) {
      setMensaje("⚠️ Selecciona quién pide y escribe el motivo.");
      return;
    }

    setMensaje("Enviando petición...");

    const { error } = await supabase.from("peticiones_oracion").insert({
      perfil_id: perfilId,
      motivo,
      estado: "activa",
    });

    if (error) {
      setMensaje("❌ Error al guardar la petición.");
      console.error(error);
    } else {
      setMensaje("✅ ¡Petición de oración agregada!");
      setMotivo("");
      setPerfilId("");
      cargarDatos();
      setTimeout(() => setMensaje(""), 3000);
    }
  };

  // Cambiar estado (activa / contestada)
  const toggleEstado = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === "activa" ? "contestada" : "activa";
    const { error } = await supabase
      .from("peticiones_oracion")
      .update({ estado: nuevoEstado })
      .eq("id", id);

    if (!error) {
      cargarDatos();
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Cargando oraciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado Principal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
          <button 
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-orange-600 font-semibold flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Peticiones de Oración
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Únete en clamor por las necesidades de nuestros hermanos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Formulario (Lateral) */}
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100 h-fit">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                <span className="text-orange-600 text-lg">🙏</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Nueva Petición</h2>
            </div>
            
            <form onSubmit={registrarPeticion} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hermano / Miembro</label>
                <select 
                  value={perfilId}
                  onChange={(e) => setPerfilId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all text-sm font-medium text-gray-700"
                  required
                >
                  <option value="">-- Seleccionar persona --</option>
                  {miembros.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Motivo de Oración</label>
                <textarea 
                  rows={5}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Escribe el motivo de la petición detalladamente aquí..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all text-sm text-gray-700 resize-none leading-relaxed placeholder-gray-400"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-orange-700 hover:shadow-lg focus:ring-4 focus:ring-orange-500/50 transition-all text-sm flex justify-center items-center gap-2 mt-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Publicar Motivo
              </button>
            </form>

            {mensaje && (
              <div className={`mt-4 p-3 rounded-lg text-center font-semibold text-xs border ${mensaje.includes('✅') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                {mensaje}
              </div>
            )}
          </div>

          {/* Muro de Oraciones (Principal) */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                <span className="text-slate-600 text-lg">🕊️</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Muro de Oraciones de la Semana</h2>
            </div>
            
            <div className="space-y-4">
              {peticiones.map((p) => (
                <div key={p.id} className="p-5 border border-gray-100 rounded-xl bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-sm transition-all hover:border-gray-200">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm tracking-tight">
                        {p.perfiles ? `${p.perfiles.nombre} ${p.perfiles.apellido}` : 'Anónimo'}
                      </span>
                      <span className="text-gray-400 text-xs font-medium bg-gray-200/50 px-2 py-0.5 rounded-full">
                        {new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm italic leading-relaxed">
                      "{p.motivo}"
                    </p>
                  </div>

                  <div className="mt-2 sm:mt-0">
                    <button
                      onClick={() => toggleEstado(p.id, p.estado)}
                      className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm transition-all ${
                        p.estado === 'contestada' 
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:shadow' 
                          : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:shadow'
                      }`}
                    >
                      {p.estado === 'contestada' ? '✨ Contestada' : '⏳ Activa'}
                    </button>
                  </div>
                </div>
              ))}

              {/* Empty State */}
              {peticiones.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-5xl mb-4 text-gray-300">🕯️</span>
                  <h3 className="text-lg font-semibold text-gray-700">El muro está despejado</h3>
                  <p className="text-gray-400 text-sm mt-1">Registra la primera petición de oración de la semana.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}