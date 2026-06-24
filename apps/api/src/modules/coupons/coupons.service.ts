import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Coupon } from "./coupon.entity";

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
  ) {}

  async validate(code: string, subtotal: number, category?: string): Promise<{ discount: number; message: string }> {
    const coupon = await this.couponRepo.findOne({ where: { code: code.toUpperCase(), isActive: true } });

    if (!coupon) throw new BadRequestException("Invalid or expired coupon code.");
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new BadRequestException("Coupon has expired.");
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) throw new BadRequestException("Coupon usage limit reached.");
    if (subtotal < coupon.minOrderAmount) throw new BadRequestException(`Minimum order of $${coupon.minOrderAmount} required.`);
    if (coupon.category && category && coupon.category !== category) throw new BadRequestException("Coupon not valid for this category.");

    let discount = 0;
    if (coupon.type === "percentage") {
      discount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else if (coupon.type === "fixed") {
      discount = Math.min(coupon.value, subtotal);
    }

    return { discount: Math.round(discount * 100) / 100, message: "Coupon applied successfully!" };
  }

  async incrementUsage(code: string): Promise<void> {
    await this.couponRepo.increment({ code }, "usageCount", 1);
  }

  async create(data: Partial<Coupon>): Promise<Coupon> {
    return this.couponRepo.save(this.couponRepo.create({ ...data, code: data.code?.toUpperCase() }));
  }

  async findAll(): Promise<Coupon[]> {
    return this.couponRepo.find({ order: { createdAt: "DESC" } });
  }

  async seedDefaultCoupons(): Promise<void> {
    const defaults = [
      { code: "WELCOME10", type: "fixed" as const, value: 10, minOrderAmount: 50 },
      { code: "SUMMER15", type: "percentage" as const, value: 15, minOrderAmount: 40 },
      { code: "SAVE20", type: "percentage" as const, value: 20, minOrderAmount: 100, maxDiscount: 30 },
    ];

    for (const c of defaults) {
      const exists = await this.couponRepo.findOne({ where: { code: c.code } });
      if (!exists) await this.create(c);
    }
  }
}
