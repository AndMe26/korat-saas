# Hoja de Ruta Técnica y Plan de Ejecución: `korat-saas`

Este documento es la guía técnica de implementación para el **Proyecto Integrador: Plataforma SaaS Multitenant**, alineada con la arquitectura actual de tu repositorio (`AndMe26/korat-saas` en **Next.js 16 + TypeScript + TypeORM + PostgreSQL/Supabase + Docker**) y enfocada en asegurar los **100 puntos base + 20 puntos adicionales**.

---

## 1. Definición de Arquitectura y Dominio

El proyecto implementa **Korat Health SaaS**, una **Plataforma Multitenant de Gestión para Clínicas Médicas y Consultorios**.

### 1.1 Modelo de Datos Multitenant (PostgreSQL + TypeORM)
El aislamiento de datos se realiza mediante la estrategia **Schema-per-Tenant** (25 pts).

* **Schema Compartido (`public`):**
  * [`Tenant`](file:///c:/Users/N1ght/Desktop/korat-saas/src/entities/Tenant.ts) (`public.tenants`): `id` (UUID), `nombre`, `slug` (ej. `clinica-sanitas`), `schema_name` (ej. `tenant_clinica_sanitas`), `created_at`.
  * [`Usuario`](file:///c:/Users/N1ght/Desktop/korat-saas/src/entities/Usuario.ts) (`public.usuarios`): `id` (UUID), `nombre`, `email` (único), `password_hash`, `rol` (`ADMIN`, `STAFF`), `tenant_id` (FK a `tenants.id`), `created_at`.
  * [`IdempotencyKey`](file:///c:/Users/N1ght/Desktop/korat-saas/src/entities/IdempotencyKey.ts) (`public.idempotency_keys`): `key` (VARCHAR PK), `tenant_id`, `endpoint`, `response_status`, `response_body` (JSONB), `created_at`, `expires_at`.

* **Schema Dinámico por Clínica (`tenant_<slug>`):**
  1. [`Paciente`](file:///c:/Users/N1ght/Desktop/korat-saas/src/entities/Paciente.ts) (`pacientes`): `id` (UUID), `nombre`, `documento` (cédula única por clínica), `telefono`, `email`, `created_at`.
  2. [`Profesional`](file:///c:/Users/N1ght/Desktop/korat-saas/src/entities/Profesional.ts) (`profesionales`): `id` (UUID), `nombre`, `especialidad` (ej. Cardiología, Pediatría), `telefono`, `activo` (boolean), `created_at`.
  3. [`Cita`](file:///c:/Users/N1ght/Desktop/korat-saas/src/entities/Cita.ts) (`citas`): `id` (UUID), `fecha_hora`, `motivo`, `estado` (`PROGRAMADA`, `ATENDIDA`, `CANCELADA`), `resumen_ia` (nullable, para el asistente clínico con IA), `paciente_id` (FK), `profesional_id` (FK), `created_at`.

---

## 2. Decisiones Técnicas Clave (Para la Sustentación)

| Requisito | Solución Técnica en `korat-saas` | Justificación para el Docente |
| :--- | :--- | :--- |
| **Modalidad** | **Opción B: Next.js Fullstack** (App Router) | Unifica API Routes y vistas en un solo despliegue manteniendo tipado estricto con TypeScript. |
| **Aislamiento (TypeORM)** | Helper `withTenantSchema(schemaName, callback)` que abre un `QueryRunner` transaccional y ejecuta `SET LOCAL search_path TO "<schema>", public;`. | Garantiza que las entidades `Paciente`, `Profesional` y `Cita` operen únicamente en el schema de la clínica activa y que el `search_path` jamás contamine el pool de conexiones de Supabase/PostgreSQL. |
| **Autenticación** | JWT firmado con `jose` guardado en **Cookie `httpOnly`, `Secure`, `SameSite=Lax`**. | `localStorage` es vulnerable a ataques XSS; las cookies `httpOnly` no pueden ser leídas por JavaScript del cliente. |
| **Resolución de Tenant** | Extraído directamente del payload del JWT (`tenantId` y `schemaName`) en el Proxy/Middleware de Next.js. | Evita consultas extra a la base de datos en cada petición y previene la suplantación por headers manipulados por el cliente. |
| **Idempotencia** | Header `Idempotency-Key` almacenado en tabla `public.idempotency_keys` con TTL de 24 horas. | Evita registros duplicados (ej. doble clic al registrar una clínica o agendar una cita médica) sin requerir infraestructura adicional. |
| **Rate Limiting** | Algoritmo **Ventana Deslizante (Sliding Window)** por `tenant_id` (o IP en login). | Previene ataques de fuerza bruta en `/api/auth/login` y abuso de recursos (*noisy neighbor*) entre clínicas en los `POST`. |
| **Renderizado** | **SSG** en Landing Page (`/`), **SSR** en Dashboard de métricas (`/dashboard`), **CSR** en gestión interactiva (`/dashboard/pacientes`, `/dashboard/profesionales`, `/dashboard/citas`). | SSG ofrece carga instantánea para SEO; SSR entrega métricas frescas desde el servidor; CSR da fluidez en filtros, formularios y modales CRUD. |

---

## 3. Plan de Implementación Paso a Paso (7 Fases — 100% Completadas)

### Fase 1: Infraestructura, Docker y Base de Datos Global ✅ (Completada)
**Meta:** Conexión activa de TypeORM con Supabase / PostgreSQL y provisión del schema `public`.
* [x] Configurar `.env.local` (Supabase) y `.env.example` documentando `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `GEMINI_API_KEY` y `GEMINI_MODEL`.
* [x] Definir las entidades de TypeORM en `src/entities/`:
  * Schema `public`: `Tenant`, `Usuario`, `IdempotencyKey`.
  * Schema por tenant: `Paciente`, `Profesional`, `Cita`.
* [x] Implementar [`src/lib/db.ts`](file:///c:/Users/N1ght/Desktop/korat-saas/src/lib/db.ts) con `AppDataSource`, `ensurePublicSchema()` y el wrapper transaccional `withTenantSchema()`.
* [x] Verificar las tablas `public.tenants`, `public.usuarios` y `public.idempotency_keys` en Supabase y exponer `/api/health`.

### Fase 2: Motor de Aislamiento y Provisión de Schemas Dinámicos ✅ (Completada)
**Meta:** Crear un tenant y que automáticamente nazca su schema con sus 3 tablas en PostgreSQL.
* [x] Implementar [`src/lib/tenant-provision.ts`](file:///c:/Users/N1ght/Desktop/korat-saas/src/lib/tenant-provision.ts) con validación estricta de identificador (`^tenant_[a-z0-9_]+$`):
  * `CREATE SCHEMA IF NOT EXISTS "tenant_xyz";`
  * Creación transaccional de las tablas `pacientes`, `profesionales` y `citas` dentro de `"tenant_xyz"`.
* [x] Implementar `withTenantSchema(schemaName, callback)` usando `QueryRunner` + `SET LOCAL search_path TO "<schemaName>", public;`.

### Fase 3: Autenticación, JWT y Proxy/Middleware ✅ (Completada)
**Meta:** Registro de clínica médica, inicio de sesión con cookie `httpOnly` y bloqueo de rutas privadas.
* [x] Instalar `jose`, `bcryptjs` (`@types/bcryptjs`) y `zod`.
* [x] Crear utilidades de sesión y firma JWT en [`src/lib/auth.ts`](file:///c:/Users/N1ght/Desktop/korat-saas/src/lib/auth.ts).
* [x] **Endpoint `POST /api/auth/register`:** Valida datos con Zod, crea la clínica en `public.tenants` y el usuario administrador en `public.usuarios`, ejecuta `provisionTenantSchema(schemaName)` y emite cookie `httpOnly`.
* [x] **Endpoint `POST /api/auth/login` y `POST /api/auth/logout`:** Verifica credenciales con `bcryptjs`, firma el JWT con `{ userId, tenantId, schemaName, rol, nombre }` y gestiona la cookie `httpOnly`.
* [x] Configurar el guardián de rutas ([`src/proxy.ts`](file:///c:/Users/N1ght/Desktop/korat-saas/src/proxy.ts) y [`src/middleware.ts`](file:///c:/Users/N1ght/Desktop/korat-saas/src/middleware.ts)) para proteger `/dashboard/:path*` y `/api/v1/:path*`, inyectando `x-tenant-id`, `x-tenant-schema` y `x-user-rol` en los headers internos tras verificar el JWT.

### Fase 4: Robustez (Idempotencia y Rate Limiting) ✅ (Completada)
**Meta:** Asegurar los 30 puntos obligatorios de arquitectura resiliente.
* [x] **Wrapper de Rate Limiting ([`src/lib/rate-limit.ts`](file:///c:/Users/N1ght/Desktop/korat-saas/src/lib/rate-limit.ts)):**
  * Aplicar límite estricto en `/api/auth/login` (5 intentos por minuto por IP).
  * Aplicar límite en endpoints `POST` de negocio (20 creaciones por minuto por `tenantId`).
  * Retornar status `429 Too Many Requests` con el header `Retry-After: <segundos>`.
* [x] **Wrapper de Idempotencia ([`src/lib/idempotency.ts`](file:///c:/Users/N1ght/Desktop/korat-saas/src/lib/idempotency.ts)):**
  * Exigir header `Idempotency-Key` en `POST /api/auth/register` y `POST /api/v1/citas` (y soportarlo en `pacientes`/`profesionales`).
  * Si la clave existe en `public.idempotency_keys` y no ha expirado, retornar inmediatamente el `response_body` y `response_status` almacenados con el header `X-Idempotent-Replayed: true`.

### Fase 5: CRUD del Dominio Médico y Estrategias de Renderizado ✅ (Completada)
**Meta:** Completar las 3 entidades operando exclusivamente sobre el schema de la clínica activa.
* [x] Crear endpoints REST en `src/app/api/v1/` usando TypeORM dentro de `withTenantSchema`:
  * [`/api/v1/pacientes`](file:///c:/Users/N1ght/Desktop/korat-saas/src/app/api/v1/pacientes/route.ts) (`GET`, `POST`, `PUT`, `DELETE`)
  * [`/api/v1/profesionales`](file:///c:/Users/N1ght/Desktop/korat-saas/src/app/api/v1/profesionales/route.ts) (`GET`, `POST`, `PUT`, `DELETE`)
  * [`/api/v1/citas`](file:///c:/Users/N1ght/Desktop/korat-saas/src/app/api/v1/citas/route.ts) (`GET`, `POST`, `PUT`, `DELETE`)
* [x] **Pantalla 1 - SSG:** [`src/app/page.tsx`](file:///c:/Users/N1ght/Desktop/korat-saas/src/app/page.tsx) como Landing Page comercial estática de *Korat Health SaaS*.
* [x] **Pantalla 2 - SSR:** [`src/app/dashboard/page.tsx`](file:///c:/Users/N1ght/Desktop/korat-saas/src/app/dashboard/page.tsx) como panel ejecutivo renderizado en servidor (total pacientes, profesionales activos, citas programadas/atendidas).
* [x] **Pantalla 3 - CSR:** Vistas interactivas en [`/dashboard/pacientes`](file:///c:/Users/N1ght/Desktop/korat-saas/src/app/dashboard/pacientes/page.tsx), [`/dashboard/profesionales`](file:///c:/Users/N1ght/Desktop/korat-saas/src/app/dashboard/profesionales/page.tsx) y [`/dashboard/citas`](file:///c:/Users/N1ght/Desktop/korat-saas/src/app/dashboard/citas/page.tsx) usando `'use client'`, envío automático de `Idempotency-Key` (`crypto.randomUUID()`) y alertas visuales ante errores `429`.

### Fase 6: Puntos Adicionales (+20 Puntos Extra) ✅ (Completada)
**Meta:** Destacar el proyecto con IA Médica y Automatización controlada.
* [x] **Asistente Clínico con Google Gemini (+10 pts):**
  * Endpoint [`POST /api/v1/ai/clinical-assistant`](file:///c:/Users/N1ght/Desktop/korat-saas/src/app/api/v1/ai/clinical-assistant/route.ts).
  * Lee el modelo desde `process.env.GEMINI_MODEL` (por defecto `gemini-2.5-flash`).
  * Funcionalidad: A partir del motivo de consulta y especialidad en una `Cita`, Gemini genera una sugerencia de triage / preparación clínica y lo guarda en `resumen_ia`.
  * Incluye caché en memoria, rate limit propio (5 peticiones/minuto por clínica) y manejo de error `429`.
* [x] **Automatización con Webhook / n8n (+10 pts):**
  * Al agendar una cita médica, dispara un webhook asíncrono (`N8N_WEBHOOK_URL` con `try/catch` no bloqueante) para notificar el evento.

### Fase 7: Docker, CI/CD, Documentación y Preparación de Sustentación ✅ (Completada)
**Meta:** Garantizar los 20 puntos de DevOps y documentación.
* [x] Configurar [`Dockerfile`](file:///c:/Users/N1ght/Desktop/korat-saas/Dockerfile) y [`docker-compose.yml`](file:///c:/Users/N1ght/Desktop/korat-saas/docker-compose.yml) para levantar `app` + `postgres` con healthcheck.
* [x] Crear [`.github/workflows/ci.yml`](file:///c:/Users/N1ght/Desktop/korat-saas/.github/workflows/ci.yml) que ejecuta `npm ci`, `npx tsc --noEmit`, `npm run lint` y `npm run build`.
* [x] Redactar el [`README.md`](file:///c:/Users/N1ght/Desktop/korat-saas/README.md) definitivo con arquitectura, decisiones técnicas y guía de pruebas.

---

## 4. Estructura de Archivos de `korat-saas`

```text
korat-saas/
├── .github/workflows/
│   └── ci.yml                       # Pipeline CI/CD obligatorio
├── src/
│   ├── entities/
│   │   ├── Tenant.ts                # [public.tenants] Clínica registrada
│   │   ├── Usuario.ts               # [public.usuarios] Usuarios de cada clínica
│   │   ├── IdempotencyKey.ts        # [public.idempotency_keys] Registro de idempotencia
│   │   ├── Paciente.ts              # [<tenant>.pacientes] Pacientes de la clínica
│   │   ├── Profesional.ts           # [<tenant>.profesionales] Médicos y especialistas
│   │   └── Cita.ts                  # [<tenant>.citas] Citas médicas + resumen IA
│   ├── app/
│   │   ├── page.tsx                 # [SSG] Landing Page pública
│   │   ├── login/page.tsx           # [CSR] Login / Registro de Clínica
│   │   ├── dashboard/
│   │   │   ├── page.tsx             # [SSR] Métricas de la Clínica actual
│   │   │   ├── pacientes/page.tsx   # [CSR] CRUD de Pacientes
│   │   │   ├── profesionales/page.tsx # [CSR] CRUD de Profesionales
│   │   │   └── citas/page.tsx       # [CSR] CRUD de Citas + Asistente IA
│   │   └── api/
│   │       ├── health/route.ts      # Estado de conexión TypeORM + PostgreSQL
│   │       ├── auth/                # register, login, logout
│   │       └── v1/                  # pacientes, profesionales, citas, ai
│   ├── lib/
│   │   ├── db.ts                    # DataSource de TypeORM y withTenantSchema()
│   │   ├── tenant-provision.ts      # Provisión DDL automática de schema y tablas
│   │   ├── auth.ts                  # Firma y verificación de JWT (jose)
│   │   ├── idempotency.ts           # Verificación de Idempotency-Key en PostgreSQL
│   │   └── rate-limit.ts            # Algoritmo Sliding Window y respuesta 429
│   └── proxy.ts / middleware.ts     # Protección de rutas y resolución de Tenant
├── .env.example                     # Plantilla de variables sin secretos
├── Dockerfile                       # Imagen de la aplicación Next.js
├── docker-compose.yml               # Orquestación de App + PostgreSQL
└── README.md                        # Documentación arquitectónica completa
```

---

## 5. Guion de Pruebas para la Sustentación Oral

1. **Prueba de Aislamiento (25 pts):**
   * Registra `Clínica Sanitas` (`tenant_clinica_sanitas`) y `Clínica Palermo` (`tenant_clinica_palermo`). Crea un paciente y un médico en `Clínica Sanitas`.
   * Inicia sesión como `Clínica Palermo` e intenta consultar o modificar el ID del paciente de `Clínica Sanitas`. El sistema devuelve `404 Not Found` porque en el schema `tenant_clinica_palermo` ese registro no existe.
2. **Prueba de Idempotencia (15 pts):**
   * Envía un `POST /api/v1/citas` con el header `Idempotency-Key: test-cita-123`.
   * Repite exactamente la misma petición 3 veces seguidas. Muestra en Supabase que solo se insertó **1 cita** y que las 3 respuestas devolvieron exactamente el mismo JSON e ID.
3. **Prueba de Rate Limiting (15 pts):**
   * Ejecuta 6 peticiones seguidas a `POST /api/auth/login` con contraseña errónea.
   * Muestra cómo la petición #6 devuelve HTTP `429 Too Many Requests` e incluye el header `Retry-After`.
4. **Defensa de Código en Vivo:**
   * Muestra [`src/lib/db.ts`](file:///c:/Users/N1ght/Desktop/korat-saas/src/lib/db.ts) y [`src/lib/tenant-provision.ts`](file:///c:/Users/N1ght/Desktop/korat-saas/src/lib/tenant-provision.ts) para explicar cómo TypeORM ejecuta el DDL del nuevo schema y cómo `withTenantSchema` aísla la transacción con `SET LOCAL search_path`.
