import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GiftCard } from "./gift-card.entity";

const VALID_AMOUNTS = [25, 50, 100, 250];

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `GIFT-${seg()}-${seg()}`;
}

@Injectable()
export class GiftCardsService {
  constructor(
    @InjectRepository(GiftCard)
    private readonly giftCardRepo: Repository<GiftCard>,
  ) {}

  async purchase(data: {
    amount: number;
    recipientEmail: string;
    senderName: string;
    message?: string;
    purchaserUserId?: string;
  }): Promise<GiftCard> {
    if (!VALID_AMOUNTS.includes(data.amount)) {
      throw new BadRequestException(`Invalid amount. Valid amounts: $${VALID_AMOUNTS.join(", $")}`);
    }

    let code: string;
    do {
      code = generateCode();
    } while (await this.giftCardRepo.findOne({ where: { code } }));

    const card = this.giftCardRepo.create({
      code,
      originalAmount: data.amount,
      remainingBalance: data.amount,
      recipientEmail: data.recipientEmail,
      senderName: data.senderName,
      message: data.message,
      purchaserUserId: data.purchaserUserId,
      status: "active",
    });

    return this.giftCardRepo.save(card);
  }

  async validate(code: string): Promise<{ balance: number; valid: boolean }> {
    const card = await this.giftCardRepo.findOne({ where: { code } });
    if (!card) return { balance: 0, valid: false };
    if (card.status !== "active" || card.remainingBalance <= 0) return { balance: 0, valid: false };
    return { balance: Number(card.remainingBalance), valid: true };
  }

  async redeem(code: string, amount: number): Promise<number> {
    const card = await this.giftCardRepo.findOne({ where: { code } });
    if (!card || card.status !== "active") throw new NotFoundException("Gift card not found or inactive.");

    const applied = Math.min(amount, Number(card.remainingBalance));
    card.remainingBalance = Number(card.remainingBalance) - applied;
    if (card.remainingBalance <= 0) card.status = "depleted";
    await this.giftCardRepo.save(card);
    return applied;
  }
}
