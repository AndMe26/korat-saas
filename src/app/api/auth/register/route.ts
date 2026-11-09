import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDataSource } from "@/lib/db";
import { buildTenantSchemaName, provisionTenantSchema } from "@/lib/tenant-provision";
import { Tenant } from "@/entities/Tenant";
import { Usuario } from "@/entities/Usuario";
import { setSessionCookie, signSessionToken } from "@/lib/auth";
import { withIdempotency } from "@/lib/idempotency";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";

/**
 * Esquema de validación con Zod para el registro de una nueva clínica (Tenant)
 * y su usuario Administrador inicial.
 */
const registerSchema = z.object({
  clinicaNombre: z
    .string()
    .min(3, "El nombre de la clínica debe tener al menos 3 caracteres")
    .max(120),
  slug: z
    .string()
    .min(3, "El identificador (slug) debe tener al menos 3 caracteres")
    .max(60)
    .regex(
      /^[a-zA-Z0-9-_]+$/,
      "El slug solo puede contener letras, números, guiones y guiones bajos"
    ),
  adminNombre: z
    .string()
    .min(3, "El nombre del administrador debe tener al menos 3 caracteres")
    .max(120),
  email: z.string().email("Correo electrónico inválido"),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(100),
});

/**
 * ENDPOINT: `POST /api/auth/register`
 * Registra una nueva Clínica Médica (Tenant), crea automáticamente su schema aislado
 * en PostgreSQL (`tenant_<slug>`) con sus 3 tablas (`pacientes`, `profesionales`, `citas`),
 * crea el usuario administrador en `public.usuarios` y devuelve la sesión iniciada en cookie `httpOnly`.
 *
 * Protecciones activas:
 * - Rate Limiting por IP (máximo 10 registros por minuto por IP).
 * - Idempotencia obligatoria mediante el header `Idempotency-Key`.
 */
export async function POST(request: Request) {
  // 1. Verificación de Rate Limiting por dirección IP
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit({
    identifier: `register:${ip}`,
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.retryAfterSeconds);
  }

  // 2. Ejecución envuelta en el motor de Idempotencia (`public.idempotency_keys`)
  return await withIdempotency(
    request,
    {
      endpoint: "POST /api/auth/register",
      tenantId: "public",
      required: true,
    },
    async () => {
      let rawBody: unknown;
      try {
        rawBody = await request.json();
      } catch {
        return {
          status: 400,
          body: { status: "error", message: "Cuerpo JSON inválido" },
        };
      }

      // 3. Validación de campos de entrada con Zod
      const parsed = registerSchema.safeParse(rawBody);
      if (!parsed.success) {
        return {
          status: 400,
          body: {
            status: "error",
            message: parsed.error.issues[0]?.message || "Datos inválidos",
            errors: parsed.error.flatten().fieldErrors,
          },
        };
      }

      const { clinicaNombre, slug, adminNombre, email, password } = parsed.data;
      const cleanSlug = slug.toLowerCase().trim();
      const schemaName = buildTenantSchemaName(cleanSlug);

      const ds = await getDataSource();
      const tenantRepo = ds.getRepository<Tenant>("Tenant");
      const userRepo = ds.getRepository<Usuario>("Usuario");

      // 4. Verificamos que no exista otra clínica con el mismo slug o schema, ni otro usuario con el mismo email
      const existingTenant = await tenantRepo.findOne({
        where: [{ slug: cleanSlug }, { schemaName }],
      });
      if (existingTenant) {
        return {
          status: 409,
          body: {
            status: "error",
            message: `Ya existe una clínica registrada con el identificador "${cleanSlug}".`,
          },
        };
      }

      const existingUser = await userRepo.findOne({
        where: { email: email.toLowerCase().trim() },
      });
      if (existingUser) {
        return {
          status: 409,
          body: {
            status: "error",
            message: "Este correo electrónico ya está registrado en el sistema.",
          },
        };
      }

      // 5. Encriptamos la contraseña con bcrypt (10 rondas de salt)
      const passwordHash = await bcrypt.hash(password, 10);

      // 6. Guardamos el Tenant y el Usuario Administrador en `public`
      const nuevoTenant = tenantRepo.create({
        nombre: clinicaNombre.trim(),
        slug: cleanSlug,
        schemaName,
      });
      await tenantRepo.save(nuevoTenant);

      const nuevoUsuario = userRepo.create({
        nombre: adminNombre.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        rol: "ADMIN",
        tenantId: nuevoTenant.id,
      });
      await userRepo.save(nuevoUsuario);

      // 7. PROVISIÓN DINÁMICA DEL SCHEMA DE LA CLÍNICA EN POSTGRESQL:
      // Crea `CREATE SCHEMA "tenant_<slug>"` y sus tablas `pacientes`, `profesionales` y `citas`
      await provisionTenantSchema(schemaName);

      // 8. Firmamos el JWT y lo guardamos en la cookie httpOnly
      const token = await signSessionToken({
        userId: nuevoUsuario.id,
        email: nuevoUsuario.email,
        nombre: nuevoUsuario.nombre,
        rol: nuevoUsuario.rol,
        tenantId: nuevoTenant.id,
        tenantNombre: nuevoTenant.nombre,
        schemaName: nuevoTenant.schemaName,
      });
      await setSessionCookie(token);

      return {
        status: 201,
        body: {
          status: "success",
          message: `Clínica "${nuevoTenant.nombre}" registrada y schema "${schemaName}" provisionado exitosamente.`,
          tenant: {
            id: nuevoTenant.id,
            nombre: nuevoTenant.nombre,
            slug: nuevoTenant.slug,
            schemaName: nuevoTenant.schemaName,
          },
          usuario: {
            id: nuevoUsuario.id,
            nombre: nuevoUsuario.nombre,
            email: nuevoUsuario.email,
            rol: nuevoUsuario.rol,
          },
        },
      };
    }
  );
}

