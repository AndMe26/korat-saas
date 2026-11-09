import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { withTenantSchema } from "@/lib/db";
import { Profesional } from "@/entities/Profesional";
import { withIdempotency } from "@/lib/idempotency";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";

/**
 * Esquema de validación con Zod para crear o editar un Profesional (Médico/Especialista).
 */
const profesionalSchema = z.object({
  nombre: z.string().min(3, "El nombre del profesional es obligatorio").max(255),
  especialidad: z
    .string()
    .min(3, "La especialidad médica es obligatoria")
    .max(150),
  telefono: z.string().min(5, "El teléfono es obligatorio").max(50),
  activo: z.boolean().optional().default(true),
});

/**
 * ENDPOINT: `GET /api/v1/profesionales`
 * Obtiene todos los médicos/especialistas registrados en el schema de la clínica actual.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { status: "error", message: "No autorizado" },
      { status: 401 }
    );
  }

  const profesionales = await withTenantSchema(
    session.schemaName,
    async (manager) => {
      return await manager.getRepository<Profesional>("Profesional").find({
        order: { createdAt: "DESC" },
      });
    }
  );

  return NextResponse.json({
    status: "success",
    schema: session.schemaName,
    data: profesionales,
  });
}

/**
 * ENDPOINT: `POST /api/v1/profesionales`
 * Registra un nuevo médico/especialista en el schema de la clínica activa.
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
      endpoint: "POST /api/v1/profesionales",
      tenantId: session.tenantId,
      required: false,
    },
    async () => {
      const rawBody = await request.json();
      const parsed = profesionalSchema.safeParse(rawBody);

      if (!parsed.success) {
        return {
          status: 400,
          body: {
            status: "error",
            message: parsed.error.issues[0]?.message || "Datos inválidos",
          },
        };
      }

      const nuevoProfesional = await withTenantSchema(
        session.schemaName,
        async (manager) => {
          const repo = manager.getRepository<Profesional>("Profesional");
          const prof = repo.create({
            nombre: parsed.data.nombre.trim(),
            especialidad: parsed.data.especialidad.trim(),
            telefono: parsed.data.telefono.trim(),
            activo: parsed.data.activo ?? true,
          });
          return await repo.save(prof);
        }
      );

      return {
        status: 201,
        body: {
          status: "success",
          message: "Profesional registrado exitosamente.",
          data: nuevoProfesional,
        },
      };
    }
  );
}

/**
 * ENDPOINT: `PUT /api/v1/profesionales`
 * Actualiza los datos o el estado (`activo`) de un médico de la clínica.
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
      { status: "error", message: "El ID del profesional es obligatorio" },
      { status: 400 }
    );
  }

  const parsed = profesionalSchema.safeParse(body);
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
    const repo = manager.getRepository<Profesional>("Profesional");
    const prof = await repo.findOne({ where: { id } });
    if (!prof) return null;

    prof.nombre = parsed.data.nombre.trim();
    prof.especialidad = parsed.data.especialidad.trim();
    prof.telefono = parsed.data.telefono.trim();
    prof.activo = parsed.data.activo;

    return await repo.save(prof);
  });

  if (!actualizado) {
    return NextResponse.json(
      {
        status: "error",
        message: "Profesional no encontrado en el schema de esta clínica.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: "success",
    message: "Profesional actualizado exitosamente.",
    data: actualizado,
  });
}

/**
 * ENDPOINT: `DELETE /api/v1/profesionales?id=<uuid>`
 * Elimina un profesional del schema de la clínica activa.
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
    const repo = manager.getRepository<Profesional>("Profesional");
    const result = await repo.delete({ id });
    return (result.affected ?? 0) > 0;
  });

  if (!eliminado) {
    return NextResponse.json(
      {
        status: "error",
        message: "Profesional no encontrado en el schema de esta clínica.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: "success",
    message: "Profesional eliminado correctamente.",
  });
}

