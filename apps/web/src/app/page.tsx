import { HeroSection } from "@/components/layout/HeroSection";
import { HeroBannerCarousel } from "@/components/layout/HeroBannerCarousel";
import { ReorderBanner } from "@/components/layout/ReorderBanner";
import { DeliveryChecker } from "@/components/layout/DeliveryChecker";
import { MarketingHighlights } from "@/components/layout/MarketingHighlights";
import { FeaturedCategories } from "@/components/product/FeaturedCategories";
import { FlashDeals } from "@/components/promotions/FlashDeals";
import { RareWhiskeyVault, type VaultFeedData } from "@/components/promotions/RareWhiskeyVault";
import { BundleDeals } from "@/components/promotions/BundleDeals";
import { GiftCardBanner } from "@/components/promotions/GiftCardBanner";
import { RewardsStrip } from "@/components/rewards/RewardsStrip";
import { SpinToWin } from "@/components/promotions/SpinToWin";
import { dbGetActiveBanners, dbGetActiveBonusTiers, dbGetVaultFeed } from "@/lib/db";

// ISR so banners ship in the initial HTML (no layout shift) yet stay fresh
export const revalidate = 60;

export default async function HomePage() {
  const [banners, bonusTiers, vault] = await Promise.all([
    dbGetActiveBanners(),
    dbGetActiveBonusTiers(),
    dbGetVaultFeed(),
  ]);
  return (
    <>
      {/* The vault's cabinet photo (291KB) is a plain <img> inside a client
          component, so the browser can't start fetching it until AFTER the
          vault's own data fetch resolves and React renders it — on a slow
          connection that shows as an empty dark box before the wood photo
          pops in (anh Sơn, 26/07). Preloading it here means the download
          starts immediately with the rest of the page instead of behind
          the vault's fetch, so by the time it's needed it's already there. */}
      <link rel="preload" as="image" href="/vault/cabinet.jpg" fetchPriority="high" />
      <SpinToWin />
      <HeroBannerCarousel initialBanners={banners} />
      {/* Renders nothing until admin adds bottles in Admin → Rare Vault.
          db's MockProduct and the client's Product are the same shape over
          the JSON wire, hence the cast. */}
      <RareWhiskeyVault initialData={vault as unknown as VaultFeedData} />
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
