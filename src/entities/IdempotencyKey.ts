import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

@Entity({ name: "idempotency_keys", schema: "public" })
export class IdempotencyKey {
  @PrimaryColumn({ type: "varchar", length: 255 })
  key!: string;

  @Column({ type: "varchar", length: 100, name: "tenant_id", nullable: true })
  tenantId!: string | null;

  @Column({ type: "varchar", length: 255 })
  endpoint!: string;

  @Column({ type: "int", name: "response_status" })
  responseStatus!: number;

  @Column({ type: "jsonb", name: "response_body" })
  responseBody!: Record<string, unknown>;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @Column({ type: "timestamp", name: "expires_at" })
  expiresAt!: Date;
}

