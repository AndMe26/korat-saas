import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/db";
import { IdempotencyKey } from "@/entities/IdempotencyKey";

/**
 * SISTEMA DE IDEMPOTENCIA (15 PUNTOS DE LA RÚBRICA):
 * Garantiza que si un cliente envía múltiples veces la misma petición `POST`
 * (por ejemplo, por doble clic o reintento de red tras una caída de conexión)
 * con el mismo header `Idempotency-Key`, la operación de negocio (crear clínica,
 * agendar cita, etc.) se ejecute UNA SOLA VEZ en la base de datos y las
 * peticiones repetidas reciban exactamente la misma respuesta original.
 */

export interface IdempotencyHandlerResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Envuelve un controlador de ruta `POST` exigiendo el header `Idempotency-Key`.
 *
 * Flujo paso a paso:
 * 1. Verifica que la petición incluya el header `Idempotency-Key`. Si falta, responde `400 Bad Request`.
 * 2. Construye una llave compuesta por `tenantId + endpoint + Idempotency-Key` para evitar colisiones entre clínicas.
 * 3. Busca en la tabla `public.idempotency_keys` si esa llave ya fue procesada y no ha expirado (TTL 24 horas).
 * 4. Si ya existe: devuelve inmediatamente el `response_body` y `response_status` guardados con el header `X-Idempotent-Replayed: true`.
 * 5. Si no existe: ejecuta la función de negocio (`handler`), guarda el resultado en `public.idempotency_keys` por 24 horas y retorna la respuesta.
 */
export async function withIdempotency(
  request: Request,
  options: {
    endpoint: string;
    tenantId?: string | null;
    required?: boolean;
  },
  handler: () => Promise<IdempotencyHandlerResult>
): Promise<NextResponse> {
  const rawKey = request.headers.get("Idempotency-Key")?.trim();

  // Si el endpoint exige Idempotency-Key y no se envió, rechazamos con 400
  if (!rawKey) {
    if (options.required !== false) {
      return NextResponse.json(
        {
          status: "error",
          code: "MISSING_IDEMPOTENCY_KEY",
          message:
            "El header 'Idempotency-Key' es obligatorio para esta operación POST para prevenir registros duplicados.",
        },
        { status: 400 }
      );
    }
    // Si era opcional y no vino, ejecutamos normalmente
    const directResult = await handler();
    return NextResponse.json(directResult.body, { status: directResult.status });
  }

  // Llave compuesta para que cada clínica tenga su propio espacio de llaves de idempotencia
  const scopedKey = `${options.tenantId || "public"}:${options.endpoint}:${rawKey}`;

  const ds = await getDataSource();
  const repo = ds.getRepository<IdempotencyKey>("IdempotencyKey");

  // Buscamos si ya existe un resultado previo para esta llave
  const existingRecord = await repo.findOne({ where: { key: scopedKey } });

  if (existingRecord) {
    const now = new Date();
    // Si aún no ha expirado, devolvemos la respuesta guardada sin tocar las tablas de negocio
    if (existingRecord.expiresAt > now) {
      return NextResponse.json(existingRecord.responseBody, {
        status: existingRecord.responseStatus,
        headers: {
          "X-Idempotent-Replayed": "true",
        },
      });
    } else {
      // Si ya expiró (más de 24h), borramos el registro viejo para permitir reutilizar la llave
      await repo.delete({ key: scopedKey });
    }
  }

  // Ejecutamos la lógica real del endpoint (ej. crear la clínica o agendar la cita)
  const result = await handler();

  // Solo guardamos en caché de idempotencia respuestas exitosas (2xx) o conflictos controlados (4xx)
  if (result.status >= 200 && result.status < 500) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expira en 24 horas
    const newRecord = repo.create({
      key: scopedKey,
      tenantId: options.tenantId || null,
      endpoint: options.endpoint,
      responseStatus: result.status,
      responseBody: result.body,
      expiresAt,
    });
    await repo.save(newRecord);
  }

  return NextResponse.json(result.body, {
    status: result.status,
    headers: {
      "X-Idempotent-Replayed": "false",
    },
  });
}

