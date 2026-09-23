import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "uuid" }) business_id!: string;
  @Column({ type: "varchar", length: 255 }) name!: string;
  @Column({ type: "varchar", length: 128, nullable: true }) category!: string | null;
  @Column({ type: "varchar", length: 32, default: "pcs" }) unit!: string;
  @Column({ type: "boolean", default: true }) is_active!: boolean;
  @DeleteDateColumn({ type: "timestamptz", nullable: true }) deleted_at!: Date | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}