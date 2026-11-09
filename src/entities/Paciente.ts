import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Cita } from "./Cita";

@Entity({ name: "pacientes" })
export class Paciente {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  nombre: string;

  @Column({ type: "varchar", length: 50, unique: true })
  documento: string; // Cédula o documento de identidad único por clínica

  @Column({ type: "varchar", length: 50 })
  telefono: string;

  @Column({ type: "varchar", length: 255 })
  email: string;

  @OneToMany(() => Cita, (cita) => cita.paciente)
  citas: Cita[];
}