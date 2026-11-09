import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Paciente } from "./Paciente";
import { Profesional } from "./Profesional";

@Entity({ name: "citas" })
export class Cita {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "timestamp", name: "fecha_hora" })
  fechaHora: Date; // Día y hora de la consulta

  @Column({ type: "text" })
  motivo: string; // Motivo de la consulta médica (ideal para usar con la IA en el opcional)

  @Column({ type: "varchar", length: 50, default: "PROGRAMADA" })
  estado: string; // PROGRAMADA, ATENDIDA, CANCELADA

  @Column({ type: "uuid", name: "paciente_id" })
  pacienteId: string;

  @ManyToOne(() => Paciente, (paciente) => paciente.citas, { onDelete: "CASCADE" })
  @JoinColumn({ name: "paciente_id" })
  paciente: Paciente;

  @Column({ type: "uuid", name: "profesional_id" })
  profesionalId: string;

  @ManyToOne(() => Profesional, (profesional) => profesional.citas, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profesional_id" })
  profesional: Profesional;
}