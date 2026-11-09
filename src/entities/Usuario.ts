import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Tenant } from "./Tenant";

@Entity({ name: "usuarios", schema: "public" })
export class Usuario {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  nombre: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 255, name: "password_hash" })
  passwordHash: string;

  @Column({ type: "uuid", name: "tenant_id" })
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.usuarios, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant: Tenant;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}