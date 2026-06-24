import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("rewards_ledger")
export class RewardsLedger {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @Column("int")
  points!: number;

  @Column()
  type!: "earn" | "redeem" | "bonus" | "birthday" | "referral" | "spin";

  @Column({ nullable: true })
  orderId?: string;

  @Column({ nullable: true })
  note?: string;

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity("user_rewards")
export class UserRewards {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  userId!: string;

  @Column("int", { default: 0 })
  totalPoints!: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  totalSpend!: number;

  @Column({ nullable: true })
  vipTier?: "silver" | "gold" | "platinum";

  @Column({ nullable: true })
  birthday?: string;

  @Column({ nullable: true })
  referralCode?: string;

  @Column("int", { default: 0 })
  referralCount!: number;
}
