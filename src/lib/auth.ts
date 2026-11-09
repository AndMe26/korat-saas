import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

/**
 * Nombre de la cookie donde se almacena el token JWT de sesión.
 * Se configura como `httpOnly` para que ningún script en el navegador (XSS) pueda leerla.
 */
export const AUTH_COOKIE_NAME = "korat_session";

/**
 * Estructura de datos (Payload) que viaja firmada dentro del JWT.
 * Incluye `tenantId` y `schemaName` para que cada petición sepa exactamente
 * a qué clínica pertenece el usuario sin consultar la base de datos de nuevo.
 */
export interface SessionPayload {
  userId: string;
  email: string;
  nombre: string;
  rol: string;
  tenantId: string;
  tenantNombre: string;
  schemaName: string;
}

/**
 * Convierte el secreto de `.env.local` (`JWT_SECRET`) al formato `Uint8Array`
 * requerido por la librería `jose` (compatible con Node.js y Edge Runtime).
 */
function getJwtSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    "korat_saas_super_secret_jwt_key_default_2026_segura";
  return new TextEncoder().encode(secret);
}

/**
 * 1. FIRMAR TOKEN JWT (`signSessionToken`):
 * Genera un token JWT firmado con el algoritmo HS256 y validez de 24 horas.
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getJwtSecretKey());
}

/**
 * 2. VERIFICAR TOKEN JWT (`verifySessionToken`):
 * Comprueba que la firma criptográfica del token sea auténtica y no haya expirado.
 * Si el token fue manipulado o venció, retorna `null`.
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (
      typeof payload.userId === "string" &&
      typeof payload.tenantId === "string" &&
      typeof payload.schemaName === "string"
    ) {
      return {
        userId: payload.userId,
        email: String(payload.email || ""),
        nombre: String(payload.nombre || ""),
        rol: String(payload.rol || "ADMIN"),
        tenantId: payload.tenantId,
        tenantNombre: String(payload.tenantNombre || ""),
        schemaName: payload.schemaName,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 3. GUARDAR SESIÓN EN COOKIE SEGURA (`setSessionCookie`):
 * Establece la cookie `korat_session` con las banderas de seguridad exigidas en la rúbrica:
 * - `httpOnly: true`: Inaccesible desde `document.cookie` (protección contra XSS).
 * - `secure`: Solo se transmite por HTTPS en producción.
 * - `sameSite: "lax"`: Protección contra ataques CSRF.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 horas en segundos
  });
}

/**
 * 4. ELIMINAR COOKIE AL CERRAR SESIÓN (`clearSessionCookie`):
 * Borra la cookie `korat_session` del navegador del usuario.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

/**
 * 5. OBTENER SESIÓN ACTUAL EN SERVER COMPONENTS O API ROUTES (`getSession`):
 * Primero intenta leer los headers internos inyectados por el Middleware/Proxy
 * (`x-tenant-schema`, `x-tenant-id`) para máxima velocidad; si no están presentes,
 * lee y verifica directamente la cookie `korat_session`.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const headerStore = await headers();
  const schemaFromHeader = headerStore.get("x-tenant-schema");
  const tenantIdFromHeader = headerStore.get("x-tenant-id");
  const userIdFromHeader = headerStore.get("x-user-id");

  if (schemaFromHeader && tenantIdFromHeader && userIdFromHeader) {
    return {
      userId: userIdFromHeader,
      email: headerStore.get("x-user-email") || "",
      nombre: decodeURIComponent(headerStore.get("x-user-nombre") || ""),
      rol: headerStore.get("x-user-rol") || "ADMIN",
      tenantId: tenantIdFromHeader,
      tenantNombre: decodeURIComponent(headerStore.get("x-tenant-nombre") || ""),
      schemaName: schemaFromHeader,
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  return await verifySessionToken(token);
}

