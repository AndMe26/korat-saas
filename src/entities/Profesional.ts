import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from "typeorm";
import type { Cita } from "./Cita";

/**
 * ENTIDAD POR TENANT: `Profesional` (Médico / Especialista)
 * Vive dentro del schema dinámico de cada clínica (`tenant_<slug>.profesionales`).
 */
@Entity({ name: "profesionales" })
export class Profesional {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  nombre!: string; // Ej: "Dr. Carlos Pérez"

  @Column({ type: "varchar", length: 150 })
  especialidad!: string; // Ej: "Cardiología", "Pediatría"

  @Column({ type: "varchar", length: 50 })
  telefono!: string;

  @Column({ type: "boolean", default: true })
  activo!: boolean; // Para saber si el doctor sigue prestando servicios

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;

  @OneToMany("Cita", (cita: Cita) => cita.profesional)
  citas!: Cita[];
}
