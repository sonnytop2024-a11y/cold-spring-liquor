import { HeroSection } from "@/components/layout/HeroSection";
import { HeroBannerCarousel } from "@/components/layout/HeroBannerCarousel";
import { ReorderBanner } from "@/components/layout/ReorderBanner";
import { DeliveryChecker } from "@/components/layout/DeliveryChecker";
import { MarketingHighlights } from "@/components/layout/MarketingHighlights";
import { FeaturedCategories } from "@/components/product/FeaturedCategories";
import { FlashDeals } from "@/components/promotions/FlashDeals";
import { BundleDeals } from "@/components/promotions/BundleDeals";
import { RewardsStrip } from "@/components/rewards/RewardsStrip";
import { SpinToWin } from "@/components/promotions/SpinToWin";

export default function HomePage() {
  return (
    <>
      <SpinToWin />
      <HeroSection />
      <HeroBannerCarousel />
      <ReorderBanner />
      <FlashDeals />
      <FeaturedCategories />
      <BundleDeals />
      <MarketingHighlights />
      <DeliveryChecker />
      <RewardsStrip />
    </>
  );
}
