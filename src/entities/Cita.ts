import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import type { Paciente } from "./Paciente";
import type { Profesional } from "./Profesional";

/**
 * ENTIDAD POR TENANT: `Cita` (Consulta Médica)
 * Vive dentro del schema dinámico de cada clínica (`tenant_<slug>.citas`)
 * y relaciona un `Paciente` con un `Profesional` del mismo schema.
 */
@Entity({ name: "citas" })
export class Cita {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "timestamp", name: "fecha_hora" })
  fechaHora!: Date; // Día y hora de la consulta

  @Column({ type: "text" })
  motivo!: string; // Motivo de la consulta médica (ideal para usar con la IA en el opcional)

  @Column({ type: "varchar", length: 50, default: "PROGRAMADA" })
  estado!: string; // PROGRAMADA, ATENDIDA, CANCELADA

  @Column({ type: "text", name: "resumen_ia", nullable: true })
  resumenIa!: string | null; // Resumen o triage sugerido por Gemini AI (+10 pts extra)

  @Column({ type: "uuid", name: "paciente_id" })
  pacienteId!: string;

  @ManyToOne("Paciente", (paciente: Paciente) => paciente.citas, { onDelete: "CASCADE" })
  @JoinColumn({ name: "paciente_id" })
  paciente!: Paciente;

  @Column({ type: "uuid", name: "profesional_id" })
  profesionalId!: string;

  @ManyToOne("Profesional", (profesional: Profesional) => profesional.citas, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profesional_id" })
  profesional!: Profesional;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;
}
