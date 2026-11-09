"use client";

import { useRouter } from "next/navigation";

/**
 * Botón sobrio para cerrar la sesión actual eliminando la cookie `httpOnly`.
 */
export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-1.5 rounded bg-stone-100 hover:bg-stone-200 border border-stone-300 text-xs font-medium text-stone-700 transition"
    >
      Salir
    </button>
  );
}
