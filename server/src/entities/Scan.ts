import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

export type ScanStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

@Entity("scans")
export class Scan {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "uuid" }) business_id!: string;
  @Column({ type: "uuid" }) shelf_id!: string;
  @Column({ type: "uuid" }) user_id!: string;
  @Column({
    type: "enum",
    enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
    enumName: "scan_status",
    default: "PENDING",
  })
  status!: ScanStatus;
  @Column({ type: "text", nullable: true }) error_message!: string | null;
  @Column({ type: "text", nullable: true }) image_key!: string | null;
  @Column({ type: "varchar", length: 100, nullable: true })
  image_content_type!: string | null;
  @Column({ type: "varchar", length: 255, nullable: true })
  image_original_name!: string | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @Column({ type: "timestamptz", nullable: true }) completed_at!: Date | null;
}
