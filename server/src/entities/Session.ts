import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";

@Entity("sessions")
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  user_id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "text", unique: true })
  refresh_token!: string;

  @Column({ type: "timestamp" })
  expires_at!: Date;

  @Column({ type: "timestamp", nullable: true })
  revoked_at!: Date | null;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;
}
