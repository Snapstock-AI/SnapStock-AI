import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type AlertType = "LOW_STOCK" | "SPOILAGE" | "FRESHNESS_RISK" | "STALE_SHELF";
export type AlertSeverity = "critical" | "warning" | "info";

@Entity("alerts")
export class Alert {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "uuid" }) business_id!: string;
  @Column({ type: "uuid", nullable: true }) product_id!: string | null;
  @Column({ type: "uuid", nullable: true }) shelf_id!: string | null;
  @Column({ type: "varchar", length: 32 }) type!: AlertType;
  @Column({ type: "varchar", length: 16, default: "warning" }) severity!: AlertSeverity;
  @Column({ type: "text", nullable: true }) title!: string | null;
  @Column({ type: "text" }) message!: string;
  @Column({ type: "varchar", length: 255, nullable: true }) dedupe_key!: string | null;
  @Column({ type: "timestamptz", nullable: true }) evidence_at!: Date | null;
  @Column({ type: "boolean", default: true }) active!: boolean;
  @Column({ type: "timestamptz", nullable: true }) resolved_at!: Date | null;
  @Column({ type: "uuid", nullable: true }) resolved_by!: string | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}
