# Korat Health SaaS — Plataforma Multitenant para Clínicas Médicas

Plataforma SaaS Fullstack construida con **Next.js 16 (App Router)**, **TypeScript**, **TypeORM** y **PostgreSQL (Supabase / Docker)** bajo una arquitectura de aislamiento físico **Schema-per-Tenant**.

---

## 1. Arquitectura Multitenant (`Schema-per-Tenant`)

Cada clínica registrada recibe automáticamente su propio esquema aislado en PostgreSQL (`tenant_<slug>`):

* **Esquema Compartido (`public`):**
  * `public.tenants`: Clínicas registradas (`id`, `nombre`, `slug`, `schema_name`).
  * `public.usuarios`: Médicos y administradores (`id`, `nombre`, `email`, `password_hash`, `rol`, `tenant_id`).
  * `public.idempotency_keys`: Almacén de llaves `Idempotency-Key` con respuesta cacheada (`JSONB`) y expiración (`expires_at`).
* **Esquema Dinámico por Clínica (`tenant_<slug>`):**
  * `pacientes`: Pacientes de la clínica (`id`, `nombre`, `documento` único por clínica, `telefono`, `email`).
  * `profesionales`: Cuerpo médico (`id`, `nombre`, `especialidad`, `telefono`, `activo`).
  * `citas`: Agenda médica (`id`, `fecha_hora`, `motivo`, `estado`, `resumen_ia`, `paciente_id`, `profesional_id`).

### ¿Cómo se garantiza el aislamiento entre clínicas?
En [`src/lib/db.ts`](src/lib/db.ts), la función `withTenantSchema(schemaName, callback)` abre una transacción SQL con un `QueryRunner` dedicado y ejecuta:
```sql
SET LOCAL search_path TO "tenant_clinica_xyz", public;
```
El modificador `LOCAL` garantiza que el cambio de esquema viva **únicamente durante esa transacción**, evitando fugas de datos en el pool de conexiones de Supabase o PostgreSQL.

---

## 2. Decisiones Técnicas y Rúbrica

1. **Autenticación Segura (`JWT + Cookie httpOnly`):**
   * Firmado con `jose` (`HS256`) en [`src/lib/auth.ts`](src/lib/auth.ts) y almacenado en la cookie `korat_session` con banderas `httpOnly`, `SameSite=Lax` y `Secure`.
   * Resolución del tenant directamente desde el payload firmado del JWT en [`src/proxy.ts`](src/proxy.ts).
2. **Idempotencia (`Idempotency-Key`):**
   * Implementada en [`src/lib/idempotency.ts`](src/lib/idempotency.ts). Exigida en `POST /api/auth/register` y `POST /api/v1/citas`. Si se repite una petición con la misma clave antes de 24 horas, retorna la respuesta guardada con el header `X-Idempotent-Replayed: true`.
3. **Rate Limiting (`Sliding Window`):**
   * Implementado en [`src/lib/rate-limit.ts`](src/lib/rate-limit.ts). Protege `POST /api/auth/login` (máx. 5 intentos/minuto por IP) y los endpoints `POST` de negocio por `tenantId`, respondiendo `429 Too Many Requests` con el header `Retry-After`.
4. **Tres Estrategias de Renderizado en Next.js:**
   * **SSG (Static Site Generation):** Landing Page comercial en [`src/app/page.tsx`](src/app/page.tsx).
   * **SSR (Server-Side Rendering):** Resumen ejecutivo con métricas en tiempo real en [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx).
   * **CSR (Client-Side Rendering):** Módulos interactivos en `/dashboard/pacientes`, `/dashboard/profesionales` y `/dashboard/citas`.
5. **Asistente Clínico con IA (Google Gemini):**
   * Endpoint `POST /api/v1/ai/clinical-assistant` que sugiere prioridad de triage y preparación clínica a partir del motivo de consulta.

---

## 3. Ejecución Local y con Docker

### Con Supabase / Node.js local
```bash
npm install
npm run dev
```
Abrir `http://localhost:3000`.

### Con Docker Compose (App + PostgreSQL 16)
```bash
docker compose up --build
```
