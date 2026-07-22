import { HeroSection } from "@/components/layout/HeroSection";
import { HeroBannerCarousel } from "@/components/layout/HeroBannerCarousel";
import { ReorderBanner } from "@/components/layout/ReorderBanner";
import { DeliveryChecker } from "@/components/layout/DeliveryChecker";
import { MarketingHighlights } from "@/components/layout/MarketingHighlights";
import { FeaturedCategories } from "@/components/product/FeaturedCategories";
import { FlashDeals } from "@/components/promotions/FlashDeals";
import { BundleDeals } from "@/components/promotions/BundleDeals";
import { GiftCardBanner } from "@/components/promotions/GiftCardBanner";
import { RewardsStrip } from "@/components/rewards/RewardsStrip";
import { SpinToWin } from "@/components/promotions/SpinToWin";
import { dbGetActiveBanners, dbGetActiveBonusTiers } from "@/lib/db";

// ISR so banners ship in the initial HTML (no layout shift) yet stay fresh
export const revalidate = 60;

export default async function HomePage() {
  const [banners, bonusTiers] = await Promise.all([dbGetActiveBanners(), dbGetActiveBonusTiers()]);
  return (
    <>
      <SpinToWin />
      <HeroBannerCarousel initialBanners={banners} />
      <HeroSection />
      <ReorderBanner />
      <FlashDeals />
      <FeaturedCategories />
      <BundleDeals />
      <GiftCardBanner bonusTiers={bonusTiers} />
      <MarketingHighlights />
      <DeliveryChecker />
      <RewardsStrip />
    </>
  );
}
