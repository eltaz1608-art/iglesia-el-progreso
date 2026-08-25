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
        
        // Consultar el rol del usuario actual buscando por su id en la tabla perfiles
        const { data: perfil } = await supabase
          .from("perfiles")
          .select("nombre, apellido, rol")
          .eq("id", session.user.id)
          .single();

        if (perfil) {
          setUserRol((perfil.rol || "general").trim().toLowerCase());
          setUserName(`${perfil.nombre || ""} ${perfil.apellido || ""}`.trim());
        } 
        
        // Resguardo directo para que el correo admin principal siempre sea pastor
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
        <p className="text-gray-500 font-medium">Cargando panel...</p>
      </div>
    );
  }

  const esPastor = userRol === 'pastor';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra de navegación superior responsive con Menú Hamburguesa */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo y Bienvenida */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">
                ⛪
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Iglesia El Progreso</h1>
                <p className="text-xs text-gray-500">
                  {userName || userEmail} • <span className="font-semibold uppercase text-blue-600">{userRol}</span>
                </p>
              </div>
            </div>

            {/* Botones en pantallas grandes (Desktop) */}
            <div className="hidden md:flex items-center gap-3">
              {esPastor && (
                <button
                  onClick={() => router.push('/dashboard/usuarios')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  ⚙️ Gestionar Usuarios
                </button>
              )}
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3.5 py-2 rounded-lg transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>

            {/* Botón Hamburguesa para Celulares (Mobile) */}
            <div className="flex md:hidden items-center">
              <button
                onClick={() => setMenuAbierto(!menuAbierto)}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none transition-colors"
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

        {/* Menú Desplegable Hamburguesa (Móvil) */}
        {menuAbierto && (
          <div className="md:hidden bg-white border-b border-gray-200 px-4 pt-2 pb-4 space-y-2 animate-fadeIn">
            {esPastor && (
              <button
                onClick={() => { setMenuAbierto(false); router.push('/dashboard/usuarios'); }}
                className="w-full text-left text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2.5 rounded-lg flex items-center gap-2"
              >
                ⚙️ Gestionar Usuarios
              </button>
            )}
            <button
              onClick={() => { setMenuAbierto(false); handleLogout(); }}
              className="w-full text-left text-sm font-medium text-red-600 bg-red-50 px-4 py-2.5 rounded-lg flex items-center gap-2"
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        )}
      </nav>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Panel General</h2>
          <p className="text-sm text-gray-500">Módulos disponibles según tu nivel de acceso.</p>
        </div>

        {/* Tarjetas de Módulos (Filtradas por Rol y optimizadas para móviles) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Asistencias */}
          {(['pastor', 'lider_asistencia', 'colaborador', 'general'].includes(userRol)) && (
            <div 
              onClick={() => router.push('/dashboard/asistencias')}
              className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer border-l-4 border-l-blue-500 active:scale-98"
            >
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Asistencias</h3>
              <p className="text-sm text-gray-500">
                {userRol === 'general' ? 'Visualiza el registro de asistencias.' : 'Registra y revisa quién vino a los cultos.'}
              </p>
            </div>
          )}

          {/* Visitas */}
          {(['pastor', 'lider_asistencia', 'colaborador', 'general'].includes(userRol)) && (
            <div 
              onClick={() => router.push('/dashboard/visitas')}
              className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer border-l-4 border-l-green-500 active:scale-98"
            >
              <div className="text-3xl mb-3">👋</div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Visitas</h3>
              <p className="text-sm text-gray-500">
                {userRol === 'general' ? 'Visualiza el registro de visitas.' : 'Seguimiento de nuevos invitados.'}
              </p>
            </div>
          )}

          {/* Cronograma */}
          {(['pastor', 'lider_cronograma', 'colaborador', 'general'].includes(userRol)) && (
            <div 
              onClick={() => router.push('/dashboard/cronograma')}
              className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer border-l-4 border-l-purple-500 active:scale-98"
            >
              <div className="text-3xl mb-3">📅</div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Cronograma</h3>
              <p className="text-sm text-gray-500">
                {userRol === 'general' ? 'Visualiza el programa de servicios.' : 'Organiza predicas, alabanza y clases.'}
              </p>
            </div>
          )}

          {/* Peticiones */}
          {(['pastor', 'colaborador', 'general', 'lider_asistencia', 'lider_cronograma'].includes(userRol)) && (
            <div 
              onClick={() => router.push('/dashboard/oraciones')}
              className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer border-l-4 border-l-orange-500 active:scale-98"
            >
              <div className="text-3xl mb-3">🙏</div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Peticiones</h3>
              <p className="text-sm text-gray-500">Motivos de oración de la semana.</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}