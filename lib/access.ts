import { supabase } from "@/lib/supabase";

export const roles = [
  "pastor",
  "lider_asistencia",
  "lider_cronograma",
  "colaborador",
  "general",
] as const;

export type Role = (typeof roles)[number];

export type Access = {
  userId: string;
  email: string;
  role: Role;
  memberId: string | null;
  name: string;
};

function isRole(value: string): value is Role {
  return roles.some((role) => role === value);
}

export async function getCurrentAccess(): Promise<Access | null> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;

  const { data: account, error: accountError } = await supabase
    .from("accesos")
    .select("usuario_id, miembro_id, rol, activo")
    .eq("usuario_id", auth.user.id)
    .single();

  if (accountError || !account?.activo || !isRole(account.rol)) return null;

  let name = "";
  if (account.miembro_id) {
    const { data: member } = await supabase
      .from("perfiles")
      .select("nombre, apellido")
      .eq("id", account.miembro_id)
      .single();
    name = [member?.nombre, member?.apellido].filter(Boolean).join(" ");
  }

  return {
    userId: auth.user.id,
    email: auth.user.email ?? "",
    role: account.rol,
    memberId: account.miembro_id,
    name,
  };
}
