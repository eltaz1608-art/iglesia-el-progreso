"use client";

import { createContext, useContext } from "react";
import type { Access } from "@/lib/access";

export const AccessContext = createContext<Access | null>(null);

export function useAccess(): Access {
  const access = useContext(AccessContext);
  if (!access) throw new Error("El acceso debe estar dentro del panel protegido.");
  return access;
}
