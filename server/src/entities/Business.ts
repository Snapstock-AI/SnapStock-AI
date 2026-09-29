import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type BusinessStatus = "ACTIVE" | "SUSPENDED";

@Entity("businesses")
export class Business {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 150 })
  business_name!: string;

  @Column({ type: "varchar", length: 255 })
  business_email!: string;

  @Column({ type: "text" })
  address!: string;

  @Column({ type: "varchar", length: 20 })
  contact_number!: string;

  /** Share of Medium+Spoiled (or spoilage-related) that triggers a warning alert (0–100). */
  @Column({ type: "int", default: 65 })
  freshness_alert_threshold!: number;

  /** Minimum detection count below which a product is considered low stock. */
  @Column({ type: "int", default: 25 })
  low_stock_threshold!: number;

  @Column({
    type: "enum",
    enum: ["ACTIVE", "SUSPENDED"],
    enumName: "business_status",
    default: "ACTIVE",
  })
  status!: BusinessStatus;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;

  @DeleteDateColumn({ type: "timestamp", nullable: true })
  deleted_at!: Date | null;
}
