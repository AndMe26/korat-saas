import Link from "next/link";
import { Suspense } from "react";
import { LogoutButton } from "./LogoutButton";

/**
 * Layout general del Panel Clínico (`/dashboard/*`).
 * Estética administrativa clara estilo historia clínica electrónica.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F7F6F2] text-stone-900 flex flex-col">
      <header className="border-b border-stone-200 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded bg-[#1B4332] text-white flex items-center justify-center font-serif font-bold text-xs">
                K
              </div>
              <span className="font-semibold text-sm text-stone-900">
                Korat Clínico
              </span>
            </Link>

            <nav className="flex items-center gap-1 text-xs font-medium">
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition"
              >
                Resumen General
              </Link>
              <Link
                href="/dashboard/pacientes"
                className="px-3 py-1.5 rounded text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition"
              >
                Pacientes
              </Link>
              <Link
                href="/dashboard/profesionales"
                className="px-3 py-1.5 rounded text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition"
              >
                Médicos
              </Link>
              <Link
                href="/dashboard/citas"
                className="px-3 py-1.5 rounded text-[#1B4332] font-semibold hover:bg-stone-100 transition"
              >
                Agenda de Citas
              </Link>
            </nav>
          </div>

          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        <Suspense
          fallback={
            <div className="p-6 rounded-lg bg-white border border-stone-200 text-xs text-stone-500">
              Cargando información del consultorio...
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
    </div>
  );
}
