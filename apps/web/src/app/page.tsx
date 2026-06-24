import { HeroSection } from "@/components/layout/HeroSection";
import { ReorderBanner } from "@/components/layout/ReorderBanner";
import { DeliveryChecker } from "@/components/layout/DeliveryChecker";
import { MarketingHighlights } from "@/components/layout/MarketingHighlights";
import { FeaturedCategories } from "@/components/product/FeaturedCategories";
import { FeaturedProducts } from "@/components/product/FeaturedProducts";
import { FlashDeals } from "@/components/promotions/FlashDeals";
import { BundleDeals } from "@/components/promotions/BundleDeals";
import { PromotionBanners } from "@/components/layout/PromotionBanners";
import { RewardsStrip } from "@/components/rewards/RewardsStrip";
import { SpinToWin } from "@/components/promotions/SpinToWin";

export default function HomePage() {
  return (
    <>
      <SpinToWin />
      <HeroSection />
      <ReorderBanner />
      <DeliveryChecker />
      <MarketingHighlights />
      <FlashDeals />
      <FeaturedCategories />
      <BundleDeals />
      <FeaturedProducts />
      <RewardsStrip />
      <PromotionBanners />
    </>
  );
}
