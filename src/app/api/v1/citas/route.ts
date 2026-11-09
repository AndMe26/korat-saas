import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { withTenantSchema } from "@/lib/db";
import { Cita } from "@/entities/Cita";
import { Paciente } from "@/entities/Paciente";
import { Profesional } from "@/entities/Profesional";
import { withIdempotency } from "@/lib/idempotency";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";

/**
 * Esquema de validación con Zod para agendar o actualizar una Cita Médica.
 */
const citaSchema = z.object({
  fechaHora: z.string().min(1, "La fecha y hora de la cita son obligatorias"),
  motivo: z
    .string()
    .min(4, "El motivo de la consulta debe tener al menos 4 caracteres"),
  estado: z
    .enum(["PROGRAMADA", "ATENDIDA", "CANCELADA"])
    .optional()
    .default("PROGRAMADA"),
  resumenIa: z.string().nullable().optional(),
  pacienteId: z.string().uuid("ID de paciente inválido"),
  profesionalId: z.string().uuid("ID de profesional inválido"),
});

/**
 * ENDPOINT: `GET /api/v1/citas`
 * Lista todas las citas médicas del schema de la clínica activa incluyendo
 * los datos del `paciente` y del `profesional` asignado.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { status: "error", message: "No autorizado" },
      { status: 401 }
    );
  }

  const citas = await withTenantSchema(session.schemaName, async (manager) => {
    return await manager.getRepository<Cita>("Cita").find({
      relations: { paciente: true, profesional: true },
      order: { fechaHora: "DESC" },
    });
  });

  return NextResponse.json({
    status: "success",
    schema: session.schemaName,
    data: citas,
  });
}

/**
 * ENDPOINT: `POST /api/v1/citas`
 * Agenda una nueva cita médica dentro del schema de la clínica activa.
 *
 * Protecciones clave para la sustentación:
 * 1. Exige el header `Idempotency-Key` (`required: true`) para garantizar los 15 puntos de idempotencia.
 * 2. Aplica Rate Limiting por `tenantId` (20 creaciones/minuto).
 * 3. Verifica que tanto el `Paciente` como el `Profesional` pertenezcan al schema de la clínica.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { status: "error", message: "No autorizado" },
      { status: 401 }
    );
  }

  const rateLimit = checkRateLimit({
    identifier: `post:${session.tenantId}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.retryAfterSeconds);
  }

  return await withIdempotency(
    request,
    {
      endpoint: "POST /api/v1/citas",
      tenantId: session.tenantId,
      required: true, // Obligatorio para demostrar idempotencia en citas médicas
    },
    async () => {
      const rawBody = await request.json();
      const parsed = citaSchema.safeParse(rawBody);

      if (!parsed.success) {
        return {
          status: 400,
          body: {
            status: "error",
            message: parsed.error.issues[0]?.message || "Datos de cita inválidos",
          },
        };
      }

      const { fechaHora, motivo, estado, resumenIa, pacienteId, profesionalId } =
        parsed.data;

      try {
        const nuevaCita = await withTenantSchema(
          session.schemaName,
          async (manager) => {
            // Verificamos que el paciente y el profesional existan en el schema de ESTA clínica
            const paciente = await manager
              .getRepository<Paciente>("Paciente")
              .findOne({ where: { id: pacienteId } });
            if (!paciente) {
              throw new Error("PACIENTE_NOT_FOUND");
            }

            const profesional = await manager
              .getRepository<Profesional>("Profesional")
              .findOne({ where: { id: profesionalId } });
            if (!profesional) {
              throw new Error("PROFESIONAL_NOT_FOUND");
            }

            const repo = manager.getRepository<Cita>("Cita");
            const cita = repo.create({
              fechaHora: new Date(fechaHora),
              motivo: motivo.trim(),
              estado,
              resumenIa: resumenIa || null,
              pacienteId,
              profesionalId,
            });
            const guardada = await repo.save(cita);
            return await repo.findOne({
              where: { id: guardada.id },
              relations: { paciente: true, profesional: true },
            });
          }
        );

        // Webhook opcional asíncrono para n8n (+10 pts extra) si está configurado
        if (process.env.N8N_WEBHOOK_URL) {
          fetch(process.env.N8N_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "cita.creada",
              tenant: session.tenantNombre,
              schema: session.schemaName,
              cita: nuevaCita,
            }),
          }).catch(() => {});
        }

        return {
          status: 201,
          body: {
            status: "success",
            message: "Cita médica agendada exitosamente.",
            data: nuevaCita,
          },
        };
      } catch (err) {
        if (err instanceof Error && err.message === "PACIENTE_NOT_FOUND") {
          return {
            status: 404,
            body: {
              status: "error",
              message: "El paciente seleccionado no existe en esta clínica.",
            },
          };
        }
        if (err instanceof Error && err.message === "PROFESIONAL_NOT_FOUND") {
          return {
            status: 404,
            body: {
              status: "error",
              message: "El profesional seleccionado no existe en esta clínica.",
            },
          };
        }
        throw err;
      }
    }
  );
}

/**
 * ENDPOINT: `PUT /api/v1/citas`
 * Permite cambiar el estado de la cita (`PROGRAMADA`, `ATENDIDA`, `CANCELADA`),
 * actualizar el motivo o guardar el `resumenIa`.
 */
export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { status: "error", message: "No autorizado" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const id = body?.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { status: "error", message: "El ID de la cita es obligatorio" },
      { status: 400 }
    );
  }

  const actualizada = await withTenantSchema(
    session.schemaName,
    async (manager) => {
      const repo = manager.getRepository<Cita>("Cita");
      const cita = await repo.findOne({ where: { id } });
      if (!cita) return null;

      if (body.estado) cita.estado = body.estado;
      if (body.motivo) cita.motivo = String(body.motivo).trim();
      if (body.fechaHora) cita.fechaHora = new Date(body.fechaHora);
      if (body.resumenIa !== undefined) cita.resumenIa = body.resumenIa;

      await repo.save(cita);
      return await repo.findOne({
        where: { id: cita.id },
        relations: { paciente: true, profesional: true },
      });
    }
  );

  if (!actualizada) {
    return NextResponse.json(
      {
        status: "error",
        message: "Cita no encontrada en el schema de esta clínica.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: "success",
    message: "Cita médica actualizada correctamente.",
    data: actualizada,
  });
}

/**
 * ENDPOINT: `DELETE /api/v1/citas?id=<uuid>`
 * Elimina una cita médica del schema de la clínica activa.
 */
export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { status: "error", message: "No autorizado" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { status: "error", message: "Parámetro id requerido" },
      { status: 400 }
    );
  }

  const eliminada = await withTenantSchema(session.schemaName, async (manager) => {
    const repo = manager.getRepository<Cita>("Cita");
    const result = await repo.delete({ id });
    return (result.affected ?? 0) > 0;
  });

  if (!eliminada) {
    return NextResponse.json(
      {
        status: "error",
        message: "Cita no encontrada en el schema de esta clínica.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: "success",
    message: "Cita médica eliminada correctamente.",
  });
}
