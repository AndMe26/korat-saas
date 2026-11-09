import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from "typeorm";
import { Usuario } from "./Usuario";

@Entity({ name: "tenants", schema: "public" })
export class Tenant {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  nombre: string;

  @Column({ type: "varchar", length: 100, unique: true })
  slug: string;

  @Column({ type: "varchar", length: 100, unique: true, name: "schema_name" })
  schemaName: string; // Ej: "tenant_clinica_sanitas"

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @OneToMany(() => Usuario, (usuario) => usuario.tenant)
  usuarios: Usuario[];
}