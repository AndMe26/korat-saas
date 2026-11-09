import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from "typeorm";
import type { Cita } from "./Cita";

/**
 * ENTIDAD POR TENANT: `Paciente`
 * No tiene `schema: "public"` fijo porque vive dentro del schema dinámico
 * de cada clínica (`tenant_<slug>.pacientes`) resuelto con `SET LOCAL search_path`.
 */
@Entity({ name: "pacientes" })
export class Paciente {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  nombre!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  documento!: string; // Cédula o documento de identidad único por clínica

  @Column({ type: "varchar", length: 50 })
  telefono!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;

  @OneToMany("Cita", (cita: Cita) => cita.paciente)
  citas!: Cita[];
}
