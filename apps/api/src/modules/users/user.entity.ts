import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  firebaseUid!: string;

  @Column()
  email!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ default: "customer" })
  role!: "customer" | "driver" | "admin";

  @Column("jsonb", { default: [] })
  addresses!: Array<{
    label?: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    lat?: number;
    lng?: number;
  }>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
