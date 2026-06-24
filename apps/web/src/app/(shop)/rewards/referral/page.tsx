import { ReferralProgram } from "@/components/rewards/ReferralProgram";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refer a Friend | CS Rewards | Cold Spring Liquor",
};

export default function ReferralPage() {
  return (
    <div className="container-main py-12">
      <ReferralProgram />
    </div>
  );
}
