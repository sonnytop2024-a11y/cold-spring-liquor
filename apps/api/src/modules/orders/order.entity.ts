import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn,
} from "typeorm";

export type OrderStatus =
  | "received"
  | "preparing"
  | "driver_assigned"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  orderNumber!: string;

  @Column()
  customerId!: string;

  @Column({ nullable: true })
  driverId?: string;

  @Column({ default: "received" })
  status!: OrderStatus;

  @Column("jsonb")
  items!: Array<{ productId: string; name: string; price: number; quantity: number }>;

  @Column("decimal", { precision: 10, scale: 2 })
  subtotal!: number;

  @Column("decimal", { precision: 10, scale: 2 })
  tax!: number;

  @Column("decimal", { precision: 10, scale: 2 })
  deliveryFee!: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  driverTip!: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  discount!: number;

  @Column("decimal", { precision: 10, scale: 2 })
  total!: number;

  @Column("jsonb")
  deliveryAddress!: {
    street: string;
    city: string;
    state: string;
    zip: string;
    lat: number;
    lng: number;
  };

  @Column({ nullable: true })
  stripePaymentIntentId?: string;

  @Column({ nullable: true })
  couponCode?: string;

  @Column({ nullable: true })
  estimatedDelivery?: string;

  @Column({ nullable: true })
  deliveredAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
