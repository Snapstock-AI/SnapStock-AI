import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type UserSystemRole = "SYSTEM_ADMIN" | "BUSINESS_USER";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  full_name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "text", nullable: true })
  password_hash!: string | null;

  @Column({ type: "varchar", length: 255, unique: true, nullable: true })
  google_id!: string | null;

  @Column({ type: "varchar", length: 15, unique: true, nullable: true })
  nic!: string | null;

  @Column({ type: "date", nullable: true })
  date_of_birth!: string | null;

  @Column({ type: "boolean", default: false })
  email_verified!: boolean;

  @Column({
    type: "enum",
    enum: ["SYSTEM_ADMIN", "BUSINESS_USER"],
    enumName: "user_system_role",
    default: "BUSINESS_USER",
  })
  system_role!: UserSystemRole;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;

  @DeleteDateColumn({ type: "timestamp", nullable: true })
  deleted_at!: Date | null;
}
