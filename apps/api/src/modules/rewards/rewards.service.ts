import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RewardsLedger, UserRewards } from "./rewards.entity";

const POINTS_PER_DOLLAR = 1;

function calcVipTier(totalSpend: number): "silver" | "gold" | "platinum" | undefined {
  if (totalSpend >= 3000) return "platinum";
  if (totalSpend >= 1500) return "gold";
  if (totalSpend >= 500) return "silver";
  return undefined;
}

function calcRedemptionValue(points: number): number {
  if (points >= 1000) return 75;
  if (points >= 500) return 35;
  if (points >= 250) return 15;
  if (points >= 100) return 5;
  return 0;
}

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(RewardsLedger)
    private readonly ledgerRepo: Repository<RewardsLedger>,
    @InjectRepository(UserRewards)
    private readonly userRewardsRepo: Repository<UserRewards>,
  ) {}

  async getOrCreate(userId: string): Promise<UserRewards> {
    let record = await this.userRewardsRepo.findOne({ where: { userId } });
    if (!record) {
      record = this.userRewardsRepo.create({
        userId,
        totalPoints: 0,
        totalSpend: 0,
        referralCode: `REFER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      });
      await this.userRewardsRepo.save(record);
    }
    return record;
  }

  async earnPoints(userId: string, orderId: string, orderTotal: number): Promise<number> {
    const points = Math.floor(orderTotal * POINTS_PER_DOLLAR);
    const rewards = await this.getOrCreate(userId);

    await this.ledgerRepo.save(
      this.ledgerRepo.create({ userId, points, type: "earn", orderId, note: `Order ${orderId}` }),
    );

    rewards.totalPoints += points;
    rewards.totalSpend += orderTotal;
    rewards.vipTier = calcVipTier(rewards.totalSpend);
    await this.userRewardsRepo.save(rewards);
    return points;
  }

  async redeemPoints(userId: string, points: number): Promise<number> {
    const value = calcRedemptionValue(points);
    if (value === 0) throw new Error("Insufficient points for redemption");

    const rewards = await this.getOrCreate(userId);
    if (rewards.totalPoints < points) throw new Error("Not enough points");

    await this.ledgerRepo.save(
      this.ledgerRepo.create({ userId, points: -points, type: "redeem", note: `Redeemed for $${value} off` }),
    );

    rewards.totalPoints -= points;
    await this.userRewardsRepo.save(rewards);
    return value;
  }

  async addBirthdayReward(userId: string): Promise<void> {
    const rewards = await this.getOrCreate(userId);
    const isVip = rewards.vipTier === "platinum";
    const credit = isVip ? 25 : 15;

    await this.ledgerRepo.save(
      this.ledgerRepo.create({
        userId,
        points: credit * 20, // convert to bonus points
        type: "birthday",
        note: `Birthday reward: $${credit} credit`,
      }),
    );

    rewards.totalPoints += credit * 20;
    await this.userRewardsRepo.save(rewards);
  }

  async addReferralBonus(referrerId: string, newUserId: string): Promise<void> {
    const BONUS_POINTS = 200; // = $10

    await this.ledgerRepo.save(
      this.ledgerRepo.create({ userId: referrerId, points: BONUS_POINTS, type: "referral", note: `Referred user ${newUserId}` }),
    );

    const referrer = await this.getOrCreate(referrerId);
    referrer.totalPoints += BONUS_POINTS;
    referrer.referralCount += 1;
    await this.userRewardsRepo.save(referrer);
  }

  async getUserRewards(userId: string): Promise<UserRewards & { history: RewardsLedger[] }> {
    const rewards = await this.getOrCreate(userId);
    const history = await this.ledgerRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: 20,
    });
    return { ...rewards, history };
  }
}
