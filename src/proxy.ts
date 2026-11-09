import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

/**
 * GUARDIÁN DE RUTAS Y RESOLUCIÓN DE TENANT (`proxy` en Next.js 16):
 * Se ejecuta en el servidor ANTES de que cualquier vista de `/dashboard/*`
 * o cualquier endpoint de `/api/v1/*` sea procesado.
 *
 * Responsabilidades clave para la sustentación:
 * 1. Extrae la cookie `korat_session` (`httpOnly`) de la petición entrante.
 * 2. Verifica criptográficamente el token JWT usando `jose`.
 * 3. Si no hay sesión válida:
 *    - En rutas `/api/v1/*`: Devuelve `401 Unauthorized` en formato JSON.
 *    - En rutas `/dashboard/*`: Redirige automáticamente a `/login`.
 * 4. Si la sesión es válida:
 *    - Extrae `tenantId` y `schemaName` directamente del payload firmado del JWT
 *      (impidiendo que un atacante suplante a otra clínica modificando headers HTTP).
 *    - Los inyecta como headers internos (`x-tenant-id`, `x-tenant-schema`) hacia los Route Handlers.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Leemos el token JWT desde la cookie httpOnly
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // Caso 1: El usuario intenta entrar a /login pero ya tiene sesión activa -> lo llevamos al Dashboard
  if (pathname.startsWith("/login") && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Caso 2: Rutas protegidas (/dashboard/* o /api/v1/*) sin sesión válida
  const isProtectedApi = pathname.startsWith("/api/v1");
  const isProtectedPage = pathname.startsWith("/dashboard");

  if ((isProtectedApi || isProtectedPage) && !session) {
    if (isProtectedApi) {
      return NextResponse.json(
        {
          status: "error",
          code: "UNAUTHORIZED",
          message: "No autorizado. Inicia sesión para acceder a los recursos de tu clínica.",
        },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Caso 3: Sesión válida -> inyectamos los datos del tenant en los headers internos de la petición
  if (session) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", session.userId);
    requestHeaders.set("x-user-email", session.email);
    requestHeaders.set("x-user-nombre", encodeURIComponent(session.nombre));
    requestHeaders.set("x-user-rol", session.rol);
    requestHeaders.set("x-tenant-id", session.tenantId);
    requestHeaders.set("x-tenant-nombre", encodeURIComponent(session.tenantNombre));
    requestHeaders.set("x-tenant-schema", session.schemaName);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/v1/:path*", "/login"],
};

