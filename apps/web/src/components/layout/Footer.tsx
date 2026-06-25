import Link from "next/link";
import { MapPin, Phone, Clock, Truck } from "lucide-react";
import { dbGetSettings } from "@/lib/db";

export async function Footer() {
  const settings = await dbGetSettings();
  const { storeName, storeAddress, storePhone, storeTextPhone } = settings;

  // Build hours summary from businessHours
  const bh = settings.businessHours ?? {};
  const weekdays = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const openDays = weekdays.filter(d => !bh[d]?.closed);
  const sundayClosed = bh["Sunday"]?.closed !== false;
  const firstOpen = bh[openDays[0]];
  const hoursLine = openDays.length > 0 && firstOpen
    ? `${openDays[0].slice(0,3)}–${openDays[openDays.length-1].slice(0,3)} ${fmtTime(firstOpen.open)}–${fmtTime(firstOpen.close)}`
    : "Mon–Sat 10am–9pm";

  return (
    <footer className="bg-dark-900 text-gray-400 pt-14 pb-6 mt-16">
      {/* FREE delivery strip */}
      <div className="border-y border-white/10 bg-brand-600/10 py-5 mb-10">
        <div className="container-main">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-white">$0</p>
              <p className="text-sm text-brand-300 font-medium">Delivery Fee — Always Free</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">$0</p>
              <p className="text-sm text-brand-300 font-medium">Tip Required — Never</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">10–30 min</p>
              <p className="text-sm text-brand-300 font-medium">Delivery Time</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-main">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div>
            <h3 className="font-heading text-white text-lg font-bold mb-1">{storeName}</h3>
            <p className="text-brand-400 text-xs font-semibold mb-4">FREE Delivery · NO Tip Required</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 text-brand-400 shrink-0" />
                <span>{storeAddress}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-brand-400 shrink-0" />
                <a href={`tel:${storePhone.replace(/\D/g,"")}`} className="hover:text-white transition-colors">
                  {storePhone}
                </a>
              </div>
              {storeTextPhone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-brand-400 shrink-0 opacity-60" />
                  <span className="text-xs">Text: <a href={`sms:${storeTextPhone.replace(/\D/g,"")}`} className="hover:text-white transition-colors">{storeTextPhone}</a></span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Clock size={14} className="mt-0.5 text-brand-400 shrink-0" />
                <span>{hoursLine}<br />{sundayClosed ? "Sunday: Closed" : `Sunday: ${fmtTime(bh["Sunday"]?.open ?? "10:00")}–${fmtTime(bh["Sunday"]?.close ?? "22:00")}`}</span>
              </div>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white font-semibold mb-4">Shop</h4>
            <ul className="space-y-2 text-sm">
              {[
                ["Whiskey", "whiskey"], ["Vodka", "vodka"], ["Tequila", "tequila"],
                ["Wine", "wine"], ["Beer", "beer"], ["Ready-to-Drink", "rtd"],
              ].map(([label, cat]) => (
                <li key={cat}>
                  <Link href={`/products?category=${cat}`} className="hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/products?sale=true" className="text-brand-400 hover:text-brand-300 transition-colors">
                  Deals & Specials
                </Link>
              </li>
            </ul>
          </div>

          {/* Rewards */}
          <div>
            <h4 className="text-white font-semibold mb-4">Rewards</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/rewards" className="hover:text-white transition-colors">CS Rewards Club</Link></li>
              <li><Link href="/rewards#vip" className="hover:text-white transition-colors">VIP Membership</Link></li>
              <li><Link href="/rewards/referral" className="hover:text-white transition-colors">Refer a Friend — Get $10</Link></li>
              <li><Link href="/gift-cards" className="hover:text-white transition-colors">Gift Cards</Link></li>
              <li><Link href="/account" className="hover:text-white transition-colors">My Account</Link></li>
            </ul>
          </div>

          {/* Delivery */}
          <div>
            <h4 className="text-white font-semibold mb-4">FREE Delivery Area</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Truck size={13} className="text-brand-400" />
                <span>Leander, TX</span>
              </li>
              <li className="flex items-center gap-2">
                <Truck size={13} className="text-brand-400" />
                <span>Cedar Park, TX</span>
              </li>
              <li className="flex items-center gap-2">
                <Truck size={13} className="text-brand-400" />
                <span>Liberty Hill, TX</span>
              </li>
            </ul>
            <div className="mt-4 bg-brand-600/20 border border-brand-600/30 rounded-lg p-3 text-xs text-brand-300">
              Within 10 miles of our store · Must be 21+ · Valid ID required at delivery
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>© 2026 {storeName}. All rights reserved. Must be 21+ to purchase alcohol. Licensed by TABC.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/responsible-drinking" className="hover:text-white transition-colors">Responsible Drinking</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2,"0")}${suffix}`;
}
