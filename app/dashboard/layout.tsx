"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AccessContext } from "@/lib/access-context";
import { getCurrentAccess, type Access, type Role } from "@/lib/access";
import { supabase } from "@/lib/supabase";

const routeRoles: Record<string, readonly Role[]> = {
  "/dashboard/usuarios": ["pastor"],
  "/dashboard/asistencias": ["pastor", "lider_asistencia"],
  "/dashboard/visitas": ["pastor", "lider_asistencia"],
  "/dashboard/cronograma": ["pastor", "lider_cronograma", "colaborador", "general", "lider_asistencia"],
  "/dashboard/oraciones": ["pastor", "lider_asistencia", "lider_cronograma", "colaborador", "general"],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [access, setAccess] = useState<Access | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const checkAccess = async () => {
      try {
        const result = await getCurrentAccess();
        if (cancelled) return;
        if (!result) {
          await supabase.auth.signOut();
          router.replace("/login");
        } else {
          setAccess(result);
        }
      } catch {
        if (!cancelled) router.replace("/login");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void checkAccess();
    return () => { cancelled = true; };
  }, [router]);

  const allowedRoles = routeRoles[pathname];
  const authorized = !!access && (!allowedRoles || allowedRoles.includes(access.role));

  useEffect(() => {
    if (!loading && access && !authorized) router.replace("/dashboard");
  }, [access, authorized, loading, router]);

  if (loading || !authorized) {
    return <div className="min-h-screen flex items-center justify-center">Comprobando acceso...</div>;
  }

  return <AccessContext.Provider value={access}>{children}</AccessContext.Provider>;
}
