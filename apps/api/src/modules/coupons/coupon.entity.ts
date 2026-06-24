import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type CouponType = "percentage" | "fixed" | "category" | "free_delivery";

@Entity("coupons")
export class Coupon {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  code!: string;

  @Column()
  type!: CouponType;

  @Column("decimal", { precision: 5, scale: 2 })
  value!: number;

  @Column({ nullable: true })
  category?: string;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  minOrderAmount!: number;

  @Column({ nullable: true })
  maxDiscount?: number;

  @Column({ nullable: true })
  usageLimit?: number;

  @Column({ default: 0 })
  usageCount!: number;

  @Column({ nullable: true })
  expiresAt?: Date;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
