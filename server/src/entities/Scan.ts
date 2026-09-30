import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

export type ScanStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type ScanMode = "STOCK_IN" | "STOCK_OUT";

@Entity("scans")
export class Scan {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "uuid" }) business_id!: string;
  @Column({ type: "uuid" }) shelf_id!: string;
  @Column({ type: "uuid" }) user_id!: string;
  @Column({ type: "varchar", length: 16, default: "STOCK_IN" })
  scan_mode!: ScanMode;
  @Column({
    type: "enum",
    enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
    enumName: "scan_status",
    default: "PENDING",
  })
  status!: ScanStatus;
  @Column({ type: "text", nullable: true }) error_message!: string | null;
  // Event-driven analysis: uploaded S3 object and the final result summary.
  @Column({ type: "text", nullable: true }) image_key!: string | null;
  @Column({ type: "varchar", length: 100, nullable: true })
  image_content_type!: string | null;
  @Column({ type: "varchar", length: 255, nullable: true })
  image_original_name!: string | null;
  @Column({ type: "jsonb", nullable: true }) result_json!: unknown | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @Column({ type: "timestamptz", nullable: true }) completed_at!: Date | null;
}
