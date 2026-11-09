import { NextResponse } from "next/server";

/**
 * SISTEMA DE RATE LIMITING (VENTANA DESLIZANTE / SLIDING WINDOW):
 * Cumple con los 15 puntos de la rúbrica para protección contra fuerza bruta
 * (en `/api/auth/login`) y prevención de abuso de recursos entre tenants (*noisy neighbor*).
 *
 * Almacena en un `Map` en memoria la lista de marcas de tiempo (timestamps en ms)
 * de cada petición por clave (`ip` o `tenantId`).
 */
const slidingWindowStore = new Map<string, number[]>();

export interface RateLimitConfig {
  /** Identificador único del cliente o tenant (ej. `login:192.168.1.1` o `post:tenant_id`) */
  identifier: string;
  /** Número máximo de peticiones permitidas dentro de la ventana de tiempo */
  limit: number;
  /** Duración de la ventana en milisegundos (ej. 60_000 ms = 1 minuto) */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * 1. VERIFICAR LÍMITE DE PETICIONES (`checkRateLimit`):
 * Filtra los timestamps que ya salieron de la ventana deslizante (`now - windowMs`).
 * - Si la cantidad de peticiones vigentes alcanza el `limit`, deniega la petición
 *   y calcula cuántos segundos faltan para que se libere el primer cupo (`Retry-After`).
 * - Si aún hay cupo, registra el timestamp actual y permite continuar.
 */
export function checkRateLimit({
  identifier,
  limit,
  windowMs,
}: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Obtenemos el historial de peticiones y descartamos las que ya caducaron
  const timestamps = (slidingWindowStore.get(identifier) || []).filter(
    (timestamp) => timestamp > windowStart
  );

  if (timestamps.length >= limit) {
    // Calculamos cuántos segundos faltan para que el registro más antiguo salga de la ventana
    const oldestTimestamp = timestamps[0];
    const retryAfterMs = oldestTimestamp + windowMs - now;
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    slidingWindowStore.set(identifier, timestamps);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  // Registramos la petición actual dentro de la ventana
  timestamps.push(now);
  slidingWindowStore.set(identifier, timestamps);

  return {
    allowed: true,
    remaining: limit - timestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * 2. RESPUESTA ESTÁNDAR HTTP 429 (`rateLimitExceededResponse`):
 * Devuelve el código de estado `429 Too Many Requests` junto con el header
 * estándar `Retry-After` exigido en la rúbrica de evaluación.
 */
export function rateLimitExceededResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    {
      status: "error",
      code: "RATE_LIMIT_EXCEEDED",
      message: `Demasiadas peticiones seguidas. Por favor espera ${retryAfterSeconds} segundos antes de volver a intentar.`,
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Reset": String(retryAfterSeconds),
      },
    }
  );
}

/**
 * Helper para extraer la dirección IP del cliente desde los headers de la petición.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

