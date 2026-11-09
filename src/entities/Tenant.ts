import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from "typeorm";
import type { Usuario } from "./Usuario";

/**
 * ENTIDAD GLOBAL: `Tenant` (Clínica Médica)
 * Vive siempre en el schema compartido `public.tenants`.
 * Guarda el nombre de la clínica, su identificador URL (`slug`) y el nombre
 * físico del schema en PostgreSQL (`schema_name`, ej. `tenant_clinica_sanitas`).
 */
@Entity({ name: "tenants", schema: "public" })
export class Tenant {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  nombre!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  slug!: string;

  @Column({ type: "varchar", length: 100, unique: true, name: "schema_name" })
  schemaName!: string; // Ej: "tenant_clinica_sanitas"

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;

  // Usamos el nombre de la entidad en string ("Usuario") para evitar dependencias circulares en Turbopack
  @OneToMany("Usuario", (usuario: Usuario) => usuario.tenant)
  usuarios!: Usuario[];
}
