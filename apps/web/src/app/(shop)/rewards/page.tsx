import { RewardsHero } from "@/components/rewards/RewardsHero";
import { HowToEarn } from "@/components/rewards/HowToEarn";
import { RedeemTable } from "@/components/rewards/RedeemTable";
import { VipTiers } from "@/components/rewards/VipTiers";
import { LoyaltyChallenges } from "@/components/rewards/LoyaltyChallenges";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CS Rewards Club | Cold Spring Liquor",
  description: "Earn points on every purchase. Redeem for discounts. Join FREE.",
};

export default function RewardsPage() {
  return (
    <div>
      <RewardsHero />
      <div className="container-main py-12 space-y-16">
        <HowToEarn />
        <RedeemTable />
        <VipTiers />
        <LoyaltyChallenges />
      </div>
    </div>
  );
}
