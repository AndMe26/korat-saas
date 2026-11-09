import { assertValidSchemaName, getDataSource } from "@/lib/db";

/**
 * 1. GENERADOR DE NOMBRE DE SCHEMA (`buildTenantSchemaName`):
 * Toma el identificador amigable (slug) de una clínica (ej. "Clínica Sanitas Bogotá")
 * y lo transforma en un nombre de schema válido para PostgreSQL:
 * -> "tenant_clinica_sanitas_bogota"
 */
export function buildTenantSchemaName(slug: string): string {
  const sanitized = slug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Elimina tildes/acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_") // Reemplaza espacios y símbolos por guion bajo
    .replace(/^_+|_+$/g, "");

  if (!sanitized) {
    throw new Error("El slug del tenant no puede estar vacío");
  }

  const schemaName = `tenant_${sanitized}`;
  // Verifica con expresión regular que el resultado sea 100% seguro
  assertValidSchemaName(schemaName);
  return schemaName;
}

/**
 * 2. PROVISIÓN DINÁMICA DE SCHEMA POR CLÍNICA (`provisionTenantSchema`):
 * Se ejecuta automáticamente cuando una nueva clínica se registra en `/api/auth/register`.
 * Dentro de una única transacción atómica (`BEGIN ... COMMIT`):
 *   a) Crea el schema aislado en PostgreSQL (`CREATE SCHEMA IF NOT EXISTS "tenant_..."`).
 *   b) Crea la tabla `pacientes` dentro de ese schema.
 *   c) Crea la tabla `profesionales` dentro de ese schema.
 *   d) Crea la tabla `citas` con sus llaves foráneas (`paciente_id`, `profesional_id`)
 *      apuntando a las tablas del mismo schema de la clínica.
 * Si cualquier paso falla, hace `ROLLBACK` completo para no dejar schemas incompletos.
 */
export async function provisionTenantSchema(schemaName: string): Promise<void> {
  assertValidSchemaName(schemaName);
  const ds = await getDataSource();
  const queryRunner = ds.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Paso A: Crear el schema exclusivo de la clínica
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);

    // Paso B: Crear tabla de Pacientes de la clínica
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".pacientes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(255) NOT NULL,
        documento VARCHAR(50) NOT NULL UNIQUE,
        telefono VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Paso C: Crear tabla de Profesionales (Médicos/Especialistas) de la clínica
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".profesionales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(255) NOT NULL,
        especialidad VARCHAR(150) NOT NULL,
        telefono VARCHAR(50) NOT NULL,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Paso D: Crear tabla de Citas Médicas vinculada a Pacientes y Profesionales del mismo schema
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".citas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fecha_hora TIMESTAMP NOT NULL,
        motivo TEXT NOT NULL,
        estado VARCHAR(50) NOT NULL DEFAULT 'PROGRAMADA',
        resumen_ia TEXT,
        paciente_id UUID NOT NULL REFERENCES "${schemaName}".pacientes(id) ON DELETE CASCADE,
        profesional_id UUID NOT NULL REFERENCES "${schemaName}".profesionales(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
