import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("drivers")
export class Driver {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @Column()
  name!: string;

  @Column()
  phone!: string;

  @Column({ nullable: true })
  vehicleInfo?: string;

  @Column({ default: false })
  isOnline!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @Column("decimal", { precision: 10, scale: 7, nullable: true })
  currentLat?: number;

  @Column("decimal", { precision: 10, scale: 7, nullable: true })
  currentLng?: number;

  @Column({ nullable: true })
  currentOrderId?: string;

  @Column({ default: 0 })
  totalDeliveries!: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  totalEarnings!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
