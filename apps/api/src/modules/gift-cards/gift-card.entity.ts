import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("gift_cards")
export class GiftCard {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  code!: string;

  @Column("decimal", { precision: 10, scale: 2 })
  originalAmount!: number;

  @Column("decimal", { precision: 10, scale: 2 })
  remainingBalance!: number;

  @Column()
  recipientEmail!: string;

  @Column({ nullable: true })
  senderName?: string;

  @Column({ nullable: true })
  message?: string;

  @Column({ default: "active" })
  status!: "active" | "depleted" | "refunded";

  @Column({ nullable: true })
  purchaserUserId?: string;

  @Column({ nullable: true })
  stripePaymentIntentId?: string;

  @CreateDateColumn()
  issuedAt!: Date;
}
