import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import type { Tenant } from "./Tenant";

/**
 * ENTIDAD GLOBAL: `Usuario` (Médico / Administrador de la Clínica)
 * Vive siempre en el schema compartido `public.usuarios` y está vinculado
 * a su clínica mediante `tenant_id`.
 */
@Entity({ name: "usuarios", schema: "public" })
export class Usuario {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  nombre!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 255, name: "password_hash" })
  passwordHash!: string;

  @Column({ type: "varchar", length: 50, default: "ADMIN" })
  rol!: string; // ADMIN, STAFF

  @Column({ type: "uuid", name: "tenant_id" })
  tenantId!: string;

  // Usamos "Tenant" como string para evitar el error de referencia circular en tiempo de carga
  @ManyToOne("Tenant", (tenant: Tenant) => tenant.usuarios, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant!: Tenant;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;
}
