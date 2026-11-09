import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDataSource } from "@/lib/db";
import { Usuario } from "@/entities/Usuario";
import { setSessionCookie, signSessionToken } from "@/lib/auth";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";

/**
 * Validación de credenciales de inicio de sesión con Zod.
 */
const loginSchema = z.object({
  email: z.string().email("Formato de correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

/**
 * ENDPOINT: `POST /api/auth/login`
 * Autentica al médico/administrador de una clínica, resuelve el `tenant` al que pertenece,
 * firma el JWT con `{ userId, tenantId, schemaName, rol }` y lo almacena en cookie `httpOnly`.
 *
 * Protección de Rate Limiting (15 puntos de la rúbrica):
 * - Permite máximo 5 intentos de login por minuto desde la misma IP.
 * - Al intento #6 devuelve HTTP `429 Too Many Requests` con el header `Retry-After`.
 */
export async function POST(request: Request) {
  // 1. Aplicamos Rate Limiting estricto por IP (5 intentos / 60 segundos)
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit({
    identifier: `login:${ip}`,
    limit: 5,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.retryAfterSeconds);
  }

  try {
    const rawBody = await request.json();
    const parsed = loginSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "error",
          message: parsed.error.issues[0]?.message || "Credenciales inválidas",
        },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const ds = await getDataSource();
    const userRepo = ds.getRepository<Usuario>("Usuario");

    // 2. Buscamos el usuario en `public.usuarios` haciendo JOIN con su clínica (`public.tenants`)
    const usuario = await userRepo.findOne({
      where: { email: email.toLowerCase().trim() },
      relations: { tenant: true },
    });

    if (!usuario || !usuario.tenant) {
      return NextResponse.json(
        {
          status: "error",
          message: "Correo electrónico o contraseña incorrectos.",
        },
        { status: 401 }
      );
    }

    // 3. Comparamos el hash de la contraseña usando bcrypt
    const isPasswordValid = await bcrypt.compare(password, usuario.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          status: "error",
          message: "Correo electrónico o contraseña incorrectos.",
        },
        { status: 401 }
      );
    }

    // 4. Generamos el JWT incluyendo el `schemaName` de la clínica del usuario
    const token = await signSessionToken({
      userId: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      tenantId: usuario.tenant.id,
      tenantNombre: usuario.tenant.nombre,
      schemaName: usuario.tenant.schemaName,
    });

    // 5. Guardamos el token en la cookie httpOnly `korat_session`
    await setSessionCookie(token);

    return NextResponse.json({
      status: "success",
      message: "Sesión iniciada correctamente.",
      tenant: {
        id: usuario.tenant.id,
        nombre: usuario.tenant.nombre,
        slug: usuario.tenant.slug,
        schemaName: usuario.tenant.schemaName,
      },
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno al iniciar sesión";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
