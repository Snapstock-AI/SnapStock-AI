import { Column, Entity, PrimaryColumn } from "typeorm";

export type BusinessUserRole = "OWNER" | "EMPLOYEE";

@Entity("business_users")
export class BusinessUser {
  @PrimaryColumn({ type: "uuid" })
  business_id!: string;

  @PrimaryColumn({ type: "uuid" })
  user_id!: string;

  @Column({
    type: "enum",
    enum: ["OWNER", "EMPLOYEE"],
    enumName: "business_user_role",
  })
  role!: BusinessUserRole;

  @Column({ type: "timestamp" })
  joined_at!: Date;
}
