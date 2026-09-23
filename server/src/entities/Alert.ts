import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("alerts")
export class Alert {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "uuid" }) business_id!: string;
  @Column({ type: "uuid", nullable: true }) product_id!: string | null;
  @Column({ type: "varchar", length: 32 }) type!: string;
  @Column({ type: "text" }) message!: string;
  @Column({ type: "boolean", default: true }) active!: boolean;
  @Column({ type: "timestamptz", nullable: true }) resolved_at!: Date | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}