import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

export type FreshnessStatus = "Fresh" | "Medium" | "Spoiled" | "UNKNOWN";

@Entity("detections")
export class Detection {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "uuid" }) scan_id!: string;
  @Column({ type: "varchar", length: 128 }) product_label!: string;
  @Column({ type: "uuid", nullable: true }) product_id!: string | null;
  @Column({ type: "numeric", precision: 5, scale: 4 }) confidence!: number;
  @Column({ type: "jsonb", nullable: true }) bbox_json!: object | null;
  @Column({
    type: "enum",
    enum: ["Fresh", "Medium", "Spoiled", "UNKNOWN"],
    enumName: "freshness_status",
    nullable: true,
  })
  freshness!: FreshnessStatus | null;
  @Column({ type: "numeric", precision: 5, scale: 4, nullable: true })
  freshness_confidence!: number | null;
  @Column({ type: "boolean", default: false }) needs_review!: boolean;
  @Column({
    type: "enum",
    enum: ["Fresh", "Medium", "Spoiled", "UNKNOWN"],
    enumName: "freshness_status",
    nullable: true,
  })
  corrected_freshness!: FreshnessStatus | null;
  @Column({ type: "uuid", nullable: true }) corrected_by!: string | null;
  @Column({ type: "timestamptz", nullable: true }) corrected_at!: Date | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
}
