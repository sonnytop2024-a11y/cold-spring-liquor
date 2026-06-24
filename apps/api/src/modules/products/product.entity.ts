import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column()
  slug!: string;

  @Column()
  name!: string;

  @Column()
  brand!: string;

  @Column()
  category!: string;

  @Column("decimal", { precision: 10, scale: 2 })
  price!: number;

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  salePrice?: number;

  @Column()
  volume!: string;

  @Column("decimal", { precision: 5, scale: 2 })
  abv!: number;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column("text", { nullable: true })
  description?: string;

  @Column({ default: true })
  inStock!: boolean;

  @Column({ default: 0 })
  stockQty!: number;

  @Column("decimal", { precision: 3, scale: 2, nullable: true })
  rating?: number;

  @Column({ default: 0 })
  reviewCount!: number;

  @Column({ nullable: true })
  country?: string;

  @Column({ default: false })
  featured!: boolean;

  @Column({ default: false })
  isDeleted!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
