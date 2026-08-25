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

  if (cargando) return <div className="p-8">Cargando peticiones de oración...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.push("/dashboard")}
          className="text-gray-500 hover:text-orange-600 font-medium"
        >
          ← Volver al Panel
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Módulo de Peticiones de Oración</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulario para nueva petición */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Nueva Petición</h2>
          
          <form onSubmit={registrarPeticion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hermano / Miembro</label>
              <select 
                value={perfilId}
                onChange={(e) => setPerfilId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                required
              >
                <option value="">-- Seleccionar persona --</option>
                {miembros.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de Oración</label>
              <textarea 
                rows={4}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Escribe el motivo de la petición aquí..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-orange-600 text-white py-2.5 rounded-lg font-semibold hover:bg-orange-700 transition-colors text-sm"
            >
              Publicar Motivo
            </button>
          </form>

          {mensaje && (
            <div className={`mt-4 p-3 rounded-lg text-center font-medium text-xs ${mensaje.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
              {mensaje}
            </div>
          )}
        </div>

        {/* Lista de peticiones */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Muro de Oraciones de la Semana</h2>
          
          <div className="space-y-4">
            {peticiones.map((p) => (
              <div key={p.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-sm">
                      {p.perfiles ? `${p.perfiles.nombre} ${p.perfiles.apellido}` : 'Anónimo'}
                    </span>
                    <span className="text-gray-400 text-xs">• {p.fecha}</span>
                  </div>
                  <p className="text-gray-600 text-sm italic">"{p.motivo}"</p>
                </div>

                <div>
                  <button
                    onClick={() => toggleEstado(p.id, p.estado)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      p.estado === 'contestada' 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    }`}
                  >
                    {p.estado === 'contestada' ? '✨ Contestada' : '⏳ Activa'}
                  </button>
                </div>
              </div>
            ))}

            {peticiones.length === 0 && (
              <p className="text-gray-400 text-sm italic text-center py-8">
                No hay peticiones de oración registradas esta semana.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}