import { GiftCardStore } from "@/components/gifts/GiftCardStore";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gift Cards | Cold Spring Liquor",
  description: "Give the gift of great drinks. Delivered instantly via email.",
};

export default function GiftCardsPage() {
  return (
    <div className="container-main py-10">
      <GiftCardStore />
    </div>
  );
}
