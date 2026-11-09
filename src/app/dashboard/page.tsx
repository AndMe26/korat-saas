import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSession } from "@/lib/auth";
import { withTenantSchema } from "@/lib/db";
import { Cita } from "@/entities/Cita";

/**
 * PANTALLA 2: RESUMEN DEL CONSULTORIO (SSR)
 * Interfaz limpia orientada al personal de salud, sin mostrar nombres internos de tablas o esquemas.
 */
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 rounded-lg bg-white border border-stone-200 text-xs text-stone-500">
          Cargando información del consultorio...
        </div>
      }
    >
      <DashboardMetricsContent />
    </Suspense>
  );
}

async function DashboardMetricsContent() {
  await connection();
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const metrics = await withTenantSchema(session.schemaName, async (manager) => {
    const totalPacientes = await manager.getRepository("Paciente").count();
    const totalProfesionales = await manager.getRepository("Profesional").count();
    const profesionalesActivos = await manager
      .getRepository("Profesional")
      .count({ where: { activo: true } });
    const totalCitas = await manager.getRepository("Cita").count();
    const citasProgramadas = await manager
      .getRepository("Cita")
      .count({ where: { estado: "PROGRAMADA" } });
    const citasAtendidas = await manager
      .getRepository("Cita")
      .count({ where: { estado: "ATENDIDA" } });

    const proximasCitas = await manager.getRepository<Cita>("Cita").find({
      relations: { paciente: true, profesional: true },
      order: { fechaHora: "DESC" },
      take: 5,
    });

    return {
      totalPacientes,
      totalProfesionales,
      profesionalesActivos,
      totalCitas,
      citasProgramadas,
      citasAtendidas,
      proximasCitas,
    };
  });

  return (
    <div className="space-y-6">
      {/* Cabecera de bienvenida de la clínica */}
      <div className="p-6 rounded-lg bg-white border border-stone-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-stone-500 mb-1">
            Panel de Gestión Clínica
          </div>
          <h1 className="text-xl font-semibold text-stone-900">
            {session.tenantNombre}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Bienvenido(a), {session.nombre}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/pacientes"
            className="px-3.5 py-2 rounded bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 font-medium text-xs transition"
          >
            Nuevo paciente
          </Link>
          <Link
            href="/dashboard/citas"
            className="px-3.5 py-2 rounded bg-[#1B4332] hover:bg-[#143325] text-white font-medium text-xs transition"
          >
            Agendar cita médica
          </Link>
        </div>
      </div>

      {/* Indicadores principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg bg-white border border-stone-200">
          <div className="text-xs text-stone-500">Pacientes registrados</div>
          <div className="text-3xl font-semibold text-stone-900 mt-1">
            {metrics.totalPacientes}
          </div>
          <Link
            href="/dashboard/pacientes"
            className="inline-block mt-3 text-xs text-[#1B4332] font-medium hover:underline"
          >
            Ver directorio de pacientes →
          </Link>
        </div>

        <div className="p-5 rounded-lg bg-white border border-stone-200">
          <div className="text-xs text-stone-500">Especialistas disponibles</div>
          <div className="text-3xl font-semibold text-stone-900 mt-1">
            {metrics.profesionalesActivos}{" "}
            <span className="text-sm font-normal text-stone-400">
              de {metrics.totalProfesionales}
            </span>
          </div>
          <Link
            href="/dashboard/profesionales"
            className="inline-block mt-3 text-xs text-[#1B4332] font-medium hover:underline"
          >
            Ver cuerpo médico →
          </Link>
        </div>

        <div className="p-5 rounded-lg bg-white border border-stone-200">
          <div className="text-xs text-stone-500">Citas en agenda</div>
          <div className="text-3xl font-semibold text-stone-900 mt-1">
            {metrics.totalCitas}
          </div>
          <div className="mt-3 text-xs text-stone-500">
            {metrics.citasProgramadas} pendientes · {metrics.citasAtendidas} atendidas
          </div>
        </div>
      </div>

      {/* Tabla de próximas consultas */}
      <div className="rounded-lg bg-white border border-stone-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <h2 className="text-sm font-semibold text-stone-800">
            Próximas consultas médicas
          </h2>
          <Link
            href="/dashboard/citas"
            className="text-xs text-[#1B4332] font-medium hover:underline"
          >
            Ver toda la agenda →
          </Link>
        </div>

        {metrics.proximasCitas.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            Aún no hay consultas programadas. Puedes registrar un{" "}
            <Link href="/dashboard/pacientes" className="text-[#1B4332] underline">
              paciente
            </Link>{" "}
            y un{" "}
            <Link
              href="/dashboard/profesionales"
              className="text-[#1B4332] underline"
            >
              especialista
            </Link>{" "}
            para comenzar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-200 text-stone-500 bg-stone-50/50">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Fecha y hora</th>
                  <th className="px-5 py-2.5 font-medium">Paciente</th>
                  <th className="px-5 py-2.5 font-medium">Médico tratante</th>
                  <th className="px-5 py-2.5 font-medium">Motivo de consulta</th>
                  <th className="px-5 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {metrics.proximasCitas.map((cita) => (
                  <tr key={cita.id} className="hover:bg-stone-50">
                    <td className="px-5 py-3 text-stone-600">
                      {new Date(cita.fechaHora).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-medium text-stone-900">
                      {cita.paciente?.nombre || "—"}
                    </td>
                    <td className="px-5 py-3 text-stone-600">
                      {cita.profesional?.nombre || "—"} (
                      {cita.profesional?.especialidad || ""})
                    </td>
                    <td className="px-5 py-3 text-stone-700">{cita.motivo}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-300 text-[11px] font-medium text-stone-700">
                        {cita.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
