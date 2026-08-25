"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | undefined>("");
  const [userRol, setUserRol] = useState<string>("general");
  const [userName, setUserName] = useState<string>("");
  
  // Estado para controlar el menú hamburguesa en celulares
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        const email = session.user.email;
        setUserEmail(email);
        
        const { data: perfil } = await supabase
          .from("perfiles")
          .select("nombre, apellido, rol")
          .eq("id", session.user.id)
          .single();

        if (perfil) {
          setUserRol((perfil.rol || "general").trim().toLowerCase());
          setUserName(`${perfil.nombre || ""} ${perfil.apellido || ""}`.trim());
        } 
        
        if (email === "admin@gmail.com") {
          setUserRol("pastor");
          if (!userName) setUserName("Admin Progreso");
        }

        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium animate-pulse">Cargando panel...</p>
        </div>
      </div>
    );
  }

  const esPastor = userRol === 'pastor';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navegación Superior (Serene Faith Style) */}
      <nav className="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo y Nombre */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xl shadow-sm">
                ⛪
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                Iglesia El Progreso
              </h1>
            </div>

            {/* Perfil y Botones (Desktop) */}
            <div className="hidden md:flex items-center gap-5">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 leading-none">
                  {userName || userEmail}
                </p>
                <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mt-1">
                  {userRol}
                </p>
              </div>
              
              <div className="h-8 w-px bg-gray-200"></div> {/* Separador visual */}

              <div className="flex gap-2">
                {esPastor && (
                  <button
                    onClick={() => router.push('/dashboard/usuarios')}
                    className="text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Usuarios
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Salir
                </button>
              </div>
            </div>

            {/* Botón Hamburguesa (Mobile) */}
            <div className="flex md:hidden items-center">
              <button
                onClick={() => setMenuAbierto(!menuAbierto)}
                className="p-2 rounded-lg text-gray-600 bg-gray-50 hover:bg-gray-100 focus:outline-none transition-colors"
                aria-label="Abrir menú"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {menuAbierto ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Menú Mobile */}
        {menuAbierto && (
          <div className="md:hidden bg-white border-b border-gray-100 px-4 pt-4 pb-6 space-y-4 shadow-lg">
            <div className="pb-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">{userName || userEmail}</p>
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">{userRol}</p>
            </div>
            <div className="space-y-2">
              {esPastor && (
                <button
                  onClick={() => { setMenuAbierto(false); router.push('/dashboard/usuarios'); }}
                  className="w-full text-left text-sm font-semibold text-blue-700 bg-blue-50 px-4 py-3 rounded-lg flex items-center gap-2"
                >
                  ⚙️ Gestionar Usuarios
                </button>
              )}
              <button
                onClick={() => { setMenuAbierto(false); handleLogout(); }}
                className="w-full text-left text-sm font-semibold text-red-700 bg-red-50 px-4 py-3 rounded-lg flex items-center gap-2"
              >
                🚪 Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Panel General</h2>
          <p className="text-sm text-gray-500 mt-1">Selecciona un módulo para gestionar la información.</p>
        </div>

        {/* Grid de Tarjetas (Serene Faith UI) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Tarjeta: Asistencias */}
          {(['pastor', 'lider_asistencia', 'colaborador', 'general'].includes(userRol)) && (
            <div 
              onClick={() => router.push('/dashboard/asistencias')}
              className="group relative overflow-hidden bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all active:scale-95 cursor-pointer"
            >
              {/* Acento Fluido Top-Right */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-200 rounded-full opacity-30 blur-2xl group-hover:opacity-50 transition-opacity duration-300"></div>
              
              <div className="relative z-10 w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl text-blue-600">📊</span>
              </div>
              <h3 className="relative z-10 font-bold text-gray-900 text-lg mb-1">Asistencias</h3>
              <p className="relative z-10 text-sm text-gray-500 leading-relaxed">
                {userRol === 'general' ? 'Visualiza el registro de asistencias.' : 'Registra y revisa quién vino a los cultos.'}
              </p>
            </div>
          )}

          {/* Tarjeta: Visitas */}
          {(['pastor', 'lider_asistencia', 'colaborador', 'general'].includes(userRol)) && (
            <div 
              onClick={() => router.push('/dashboard/visitas')}
              className="group relative overflow-hidden bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-100 transition-all active:scale-95 cursor-pointer"
            >
              {/* Acento Fluido Top-Right */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-green-200 rounded-full opacity-30 blur-2xl group-hover:opacity-50 transition-opacity duration-300"></div>
              
              <div className="relative z-10 w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl text-green-600">👋</span>
              </div>
              <h3 className="relative z-10 font-bold text-gray-900 text-lg mb-1">Visitas</h3>
              <p className="relative z-10 text-sm text-gray-500 leading-relaxed">
                {userRol === 'general' ? 'Visualiza el registro de visitas.' : 'Seguimiento de nuevos invitados a la iglesia.'}
              </p>
            </div>
          )}

          {/* Tarjeta: Cronograma */}
          {(['pastor', 'lider_cronograma', 'colaborador', 'general'].includes(userRol)) && (
            <div 
              onClick={() => router.push('/dashboard/cronograma')}
              className="group relative overflow-hidden bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-100 transition-all active:scale-95 cursor-pointer"
            >
              {/* Acento Fluido Top-Right */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-purple-200 rounded-full opacity-30 blur-2xl group-hover:opacity-50 transition-opacity duration-300"></div>
              
              <div className="relative z-10 w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl text-purple-600">📅</span>
              </div>
              <h3 className="relative z-10 font-bold text-gray-900 text-lg mb-1">Cronograma</h3>
              <p className="relative z-10 text-sm text-gray-500 leading-relaxed">
                {userRol === 'general' ? 'Visualiza el programa de servicios.' : 'Organiza predicas, alabanza y actividades.'}
              </p>
            </div>
          )}

          {/* Tarjeta: Peticiones */}
          {(['pastor', 'colaborador', 'general', 'lider_asistencia', 'lider_cronograma'].includes(userRol)) && (
            <div 
              onClick={() => router.push('/dashboard/oraciones')}
              className="group relative overflow-hidden bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-100 transition-all active:scale-95 cursor-pointer"
            >
              {/* Acento Fluido Top-Right */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-orange-200 rounded-full opacity-30 blur-2xl group-hover:opacity-50 transition-opacity duration-300"></div>
              
              <div className="relative z-10 w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl text-orange-600">🙏</span>
              </div>
              <h3 className="relative z-10 font-bold text-gray-900 text-lg mb-1">Peticiones</h3>
              <p className="relative z-10 text-sm text-gray-500 leading-relaxed">
                Revisa y gestiona los motivos de oración de la semana.
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}