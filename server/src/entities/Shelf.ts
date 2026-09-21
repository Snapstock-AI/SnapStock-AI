import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("shelves")
export class Shelf {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "uuid" }) business_id!: string;
  @Column({ type: "varchar", length: 100 }) name!: string;
  @Column({ type: "varchar", length: 100, nullable: true }) category!: string | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
  @DeleteDateColumn({ type: "timestamptz", nullable: true }) deleted_at!: Date | null;
}