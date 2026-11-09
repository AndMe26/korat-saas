import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Cita } from "./Cita";

@Entity({ name: "profesionales" })
export class Profesional {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  nombre: string; // Ej: "Dr. Carlos Pérez"

  @Column({ type: "varchar", length: 150 })
  especialidad: string; // Ej: "Cardiología", "Pediatría"

  @Column({ type: "varchar", length: 50 })
  telefono: string;

  @Column({ type: "boolean", default: true })
  activo: boolean; // Para saber si el doctor sigue prestando servicios

  @OneToMany(() => Cita, (cita) => cita.profesional)
  citas: Cita[];
}