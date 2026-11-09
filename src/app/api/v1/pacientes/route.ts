import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { withTenantSchema } from "@/lib/db";
import { Paciente } from "@/entities/Paciente";
import { withIdempotency } from "@/lib/idempotency";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";

/**
 * Validación con Zod para crear o actualizar un Paciente dentro de la clínica activa.
 */
const pacienteSchema = z.object({
  nombre: z.string().min(2, "El nombre del paciente es obligatorio").max(255),
  documento: z
    .string()
    .min(4, "El documento/cédula debe tener al menos 4 caracteres")
    .max(50),
  telefono: z.string().min(5, "El teléfono es obligatorio").max(50),
  email: z.string().email("Correo electrónico inválido").max(255),
});

/**
 * ENDPOINT: `GET /api/v1/pacientes`
 * Lista todos los pacientes registrados EXCLUSIVAMENTE en el schema de la clínica activa.
 * Usa `withTenantSchema(session.schemaName, ...)` que ejecuta `SET LOCAL search_path`.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { status: "error", message: "No autorizado" },
      { status: 401 }
    );
  }

  try {
    const pacientes = await withTenantSchema(session.schemaName, async (manager) => {
      return await manager.getRepository<Paciente>("Paciente").find({
        order: { createdAt: "DESC" },
      });
    });

    return NextResponse.json({
      status: "success",
      schema: session.schemaName,
      data: pacientes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al listar pacientes";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}

/**
 * ENDPOINT: `POST /api/v1/pacientes`
 * Crea un nuevo paciente dentro del schema aislado de la clínica (`tenant_<slug>.pacientes`).
 * Protegido con Rate Limiting por `tenantId` y soporte de `Idempotency-Key`.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { status: "error", message: "No autorizado" },
      { status: 401 }
    );
  }

  // Rate limiting por clínica: máximo 20 creaciones por minuto
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
      endpoint: "POST /api/v1/pacientes",
      tenantId: session.tenantId,
      required: false, // Si envía Idempotency-Key se deduplica; si no, procede
    },
    async () => {
      const rawBody = await request.json();
      const parsed = pacienteSchema.safeParse(rawBody);

      if (!parsed.success) {
        return {
          status: 400,
          body: {
            status: "error",
            message: parsed.error.issues[0]?.message || "Datos inválidos",
          },
        };
      }

      const { nombre, documento, telefono, email } = parsed.data;

      try {
        const nuevoPaciente = await withTenantSchema(
          session.schemaName,
          async (manager) => {
            const repo = manager.getRepository<Paciente>("Paciente");
            const existente = await repo.findOne({
              where: { documento: documento.trim() },
            });
            if (existente) {
              throw new Error("DUPLICATE_DOCUMENTO");
            }

            const paciente = repo.create({
              nombre: nombre.trim(),
              documento: documento.trim(),
              telefono: telefono.trim(),
              email: email.toLowerCase().trim(),
            });
            return await repo.save(paciente);
          }
        );

        return {
          status: 201,
          body: {
            status: "success",
            message: "Paciente registrado exitosamente.",
            data: nuevoPaciente,
          },
        };
      } catch (err) {
        if (err instanceof Error && err.message === "DUPLICATE_DOCUMENTO") {
          return {
            status: 409,
            body: {
              status: "error",
              message: `Ya existe un paciente con el documento "${documento}" en esta clínica.`,
            },
          };
        }
        throw err;
      }
    }
  );
}

/**
 * ENDPOINT: `PUT /api/v1/pacientes`
 * Actualiza los datos de un paciente existente dentro del schema de la clínica.
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
      { status: "error", message: "El ID del paciente es obligatorio" },
      { status: 400 }
    );
  }

  const parsed = pacienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        status: "error",
        message: parsed.error.issues[0]?.message || "Datos inválidos",
      },
      { status: 400 }
    );
  }

  const actualizado = await withTenantSchema(session.schemaName, async (manager) => {
    const repo = manager.getRepository<Paciente>("Paciente");
    const paciente = await repo.findOne({ where: { id } });
    if (!paciente) return null;

    paciente.nombre = parsed.data.nombre.trim();
    paciente.documento = parsed.data.documento.trim();
    paciente.telefono = parsed.data.telefono.trim();
    paciente.email = parsed.data.email.toLowerCase().trim();

    return await repo.save(paciente);
  });

  if (!actualizado) {
    return NextResponse.json(
      {
        status: "error",
        message: "Paciente no encontrado en el schema de esta clínica.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: "success",
    message: "Paciente actualizado correctamente.",
    data: actualizado,
  });
}

/**
 * ENDPOINT: `DELETE /api/v1/pacientes?id=<uuid>`
 * Elimina un paciente del schema de la clínica activa.
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

  const eliminado = await withTenantSchema(session.schemaName, async (manager) => {
    const repo = manager.getRepository<Paciente>("Paciente");
    const result = await repo.delete({ id });
    return (result.affected ?? 0) > 0;
  });

  if (!eliminado) {
    return NextResponse.json(
      {
        status: "error",
        message: "Paciente no encontrado en el schema de esta clínica.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: "success",
    message: "Paciente eliminado correctamente.",
  });
}

