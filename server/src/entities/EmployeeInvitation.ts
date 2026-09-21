import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";

export type InvitationRole = "OWNER" | "EMPLOYEE";

@Entity("employee_invitations")
export class EmployeeInvitation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  business_id!: string;

  @Column({ type: "uuid" })
  invited_by!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({
    type: "enum",
    enum: ["OWNER", "EMPLOYEE"],
    enumName: "business_user_role",
    default: "EMPLOYEE",
  })
  role!: InvitationRole;

  @Column({ type: "text", unique: true })
  invitation_token!: string;

  @Column({
    type: "enum",
    enum: ["PENDING", "ACCEPTED", "EXPIRED", "CANCELLED"],
    enumName: "invitation_status",
    default: "PENDING",
  })
  status!: InvitationStatus;

  @Column({ type: "timestamp" })
  expires_at!: Date;

  @Column({ type: "timestamp", nullable: true })
  accepted_at!: Date | null;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;
}
