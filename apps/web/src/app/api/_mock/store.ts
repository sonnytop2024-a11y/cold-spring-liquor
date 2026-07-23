import fs from "fs";
import path from "path";
import os from "os";
import { PRODUCTS } from "./data";

const STORE_FILE = path.join(os.tmpdir(), "csl-mock-store.json");

export type OrderStatus =
  | "pending" | "confirmed" | "preparing"
  | "driver_assigned" | "driver_at_store"
  | "out_for_delivery" | "driver_arriving" | "driver_arrived"
  | "delivered" | "failed_delivery" | "cancelled"
  | "ready_for_pickup" | "picked_up";

export interface PickupWindow {
  start: string; // ISO
  end: string;   // ISO
  label: string; // e.g. "10:30 – 11:30 AM"
  dateLabel: string; // e.g. "Today, Jul 3" / "Sat, Jul 4"
}

export interface MockOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  items: Array<{
    productId: string; name: string; price: number; quantity: number;
    // Missing Product Image Assistance — customer-supplied when the product has no photo
    referenceImageUrl?: string; verificationNote?: string;
  }>;
  subtotal: number;
  bundleDiscount: number;
  couponDiscount: number;
  couponCode?: string;
  rewardsDiscount?: number;
  rewardsPointsToRedeem?: number;
  giftCardCode?: string;
  giftCardAmount?: number;
  // Per-card breakdown when multiple gift cards are stacked on one order
  giftCards?: { code: string; amount: number }[];
  paymentMethod?: string;
  stripePaymentIntentId?: string;
  stripeRefundId?: string;
  refundStatus?: string;
  refundedAt?: string;
  refundedAmount?: number;
  inventoryRestocked?: boolean;
  // Pick Up In Store
  orderType?: "delivery" | "pickup";
  pickupWindow?: PickupWindow;
  pickupDiscount?: number;
  readyEmailSent?: boolean;
  readySmsSent?: boolean;
  pickedUpAt?: string;
  paypalOrderId?: string;
  tax: number;
  total: number;
  deliveryFee: number;
  driverCompensation?: number;
  deliveryAddress: { street: string; city: string; state: string; zip: string };
  billingAddress?: { street: string; city: string; state: string; zip: string };
  billingAddressSameAsDelivery?: boolean;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes?: string; // optional note left at checkout — shown to admin + driver
  customerId: string | null;
  driverId: string | null;
  deliveryType?: "same-day" | "next-morning";
  statusTimestamps?: Record<string, string>;
  waitTimerStart?: string;
  deliveryConfirmations?: {
    ageVerified: boolean;
    idChecked: boolean;
    nameMatched: boolean;
    handedToCustomer: boolean;
    customerDob?: string;
    customerAge?: number;
  };
  ageVerified?: boolean;
  signatureUrl?: string;
  deliveryProof?: string;
  failReason?: string;
  adminNote?: string;
  cancelReason?: string;
  refundType?: string;
  refundAmount?: number;
  distanceMiles?: number;
  etaMinutes?: number;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery: string | null;
  // Missed Order Phone Call Alert
  missedCallAlerts?: MissedCallAlert[];
}

export interface MissedCallAlert {
  attempt: number; // 1, 2, 3...
  calledAt: string; // ISO
  status: "sent" | "answered" | "no-answer" | "busy" | "failed";
  callSid?: string;
  answeredAt?: string;
}

export interface MockProduct {
  id: string; slug: string; name: string; brand: string; category: string;
  price: number; salePrice: number | null; volume: string; abv: number;
  country: string; stockQty: number; inStock: boolean; featured: boolean;
  active: boolean; rating: number; reviewCount: number; description: string;
  imageUrl: string | null; bundleEligible: boolean;
  // Precomputed catalog order: hasImage → brand/name group → name (see computeProductSortKey)
  sortKey?: string;
  // Excluded from coupon-code discounts (still eligible for flash sale/bundle)
  couponExcluded?: boolean;
  // Orderable via Pick Up In Store only — blocked for Delivery
  pickupOnly?: boolean;
}

export interface SavedAddress {
  street: string; city: string; state: string; zip: string;
}

export interface MockUser {
  id: string; name: string; email: string; phone: string; dob: string;
  passwordHash: string; points: number;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum"; createdAt: string;
  deliveryAddress?: SavedAddress;
  billingAddress?: SavedAddress;
  billingAddressSameAsDelivery?: boolean;
  googleId?: string;
  resetToken?: string;
  resetTokenExpiry?: string;
  savedCart?: Array<{ product: Record<string, unknown>; quantity: number }>;
}

export interface MockDriver {
  id: string;
  name: string;
  phone: string;
  email: string;
  username: string;
  passwordHash: string; // mock: base64
  pin: string;          // 4-digit PIN for driver app
  active: boolean;
  isOnline: boolean;
  lat: number | null;
  lng: number | null;
  locationUpdatedAt: string | null;
  currentOrderId: string | null;
  totalDeliveries: number;
  totalEarnings: number;
  rating: number;
  createdAt: string;
}

export interface MockNotification {
  id: string;
  orderId: string;
  customerId: string;
  orderNumber: string;
  triggerStatus: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface MockCoupon {
  id: string;
  code: string;
  type: "fixed" | "percentage" | "free_delivery";
  value: number;
  label: string;
  minOrder: number;
  maxUsage: number | null;
  usagePerCustomer: number | null;
  usageCount: number;
  active: boolean;
  startDate: string | null;
  endDate: string | null;
  categoryRestriction: string | null;
  createdAt: string;
}

export interface MockFlashDeal {
  id: string;
  name: string;
  brand: string;
  slug: string;
  price: number;
  salePrice: number;
  imageUrl: string | null;
  volume: string;
  stockQty: number;
  maxStock: number;
  active: boolean;
  startAt: string | null;
  endsAt: string | null;
  createdAt: string;
  productId?: string | null;
  sortOrder?: number;
}

export interface MockBundleTier {
  id: string;
  minQty: number;
  discountPct: number;
  label: string;
  active: boolean;
  sortOrder: number;
}

/* Hero day/night display — "auto" follows Central Time (day 6:00 AM–5:59 PM),
   "day"/"night" force one scene for every visitor. Site-wide, admin-controlled. */
export type HeroDisplayMode = "auto" | "day" | "night";
export const HERO_DISPLAY_MODES: HeroDisplayMode[] = ["auto", "day", "night"];
export const DEFAULT_HERO_DISPLAY_MODE: HeroDisplayMode = "auto";

export interface HeroWeatherSettings {
  enabled: boolean;
  rain: { enabled: boolean; intensity: "light" | "medium" | "heavy" };
  lightning: { enabled: boolean; frequency: "low" | "medium" | "high" };
  opacity: number; // 10–100
}

export const DEFAULT_HERO_WEATHER: HeroWeatherSettings = {
  enabled: true,
  rain: { enabled: true, intensity: "light" },
  // Lightning defaults OFF — admins turn it on for special campaigns only
  lightning: { enabled: false, frequency: "low" },
  opacity: 35,
};

export interface HeroShowcaseProduct {
  id: string;
  kicker: string;        // headline inside the circle, e.g. "NEW ARRIVAL"
  subtitle: string;      // e.g. "Just In · Limited Stock"
  badge: string;         // sticker text, lines separated by "\n"
  price: number;
  regularPrice: number | null;
  imageUrl: string | null; // transparent PNG/WebP, auto-trimmed at upload
  url: string;           // link opened on tap, e.g. /products/slug
  active: boolean;
  order: number;
}

export interface HeroShowcaseSettings {
  enabled: boolean;
  // Per-device visibility: the mobile hero has a clean dark corner for the
  // showcase; the desktop artwork is busier (bottle basket, truck, route),
  // so desktop defaults OFF — admins can enable it anytime.
  showOnMobile: boolean;
  showOnDesktop: boolean;
  products: HeroShowcaseProduct[]; // max 5 active
  // Admin-tunable placement per breakpoint (approved via design preview)
  mobile: { size: number; right: number; bottom: number };  // px, %, %
  desktop: { size: number; left: number; bottom: number };  // px, %, %
}

export const DEFAULT_HERO_SHOWCASE: HeroShowcaseSettings = {
  enabled: true, // with zero products the showcase auto-hides, so ON is safe
  showOnMobile: true,
  showOnDesktop: false,
  products: [],
  mobile: { size: 150, right: 4, bottom: 4 },
  desktop: { size: 160, left: 46, bottom: 4.5 },
};

export interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeTextPhone?: string;
  storeEmail: string;
  websiteDomain: string;
  businessHours: Record<string, { open: string; close: string; closed: boolean }>;
  deliveryRadius: number;
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  freeDeliveryEnabled: boolean;
  deliveryEnabled?: boolean; // admin kill-switch: false = Pick Up only (no driver available)
  noTipRequired: boolean;
  minOrderAmount: number;
  ageVerificationRequired: boolean;
  dobRequired: boolean;
  billingAddressRequired: boolean;
  deliveryAddressRequired: boolean;
  promoCodeEnabled: boolean;
  rewardsEnabled: boolean;
  orderNotesEnabled: boolean;
  newOrderSoundEnabled: boolean;
  newOrderPopupEnabled: boolean;
  newOrderBadgeEnabled: boolean;
  driverOnlineStatusEnabled: boolean;
  assignOnlineDriversOnly: boolean;
  salesTaxPercent: number;
  onlinePaymentEnabled: boolean;
  cashOnDeliveryEnabled: boolean;
  stripePublishableKey: string;
  rewardClubName: string;
  promoCodesEnabled: boolean;
  giftCodesEnabled: boolean;
  birthdayRewardEnabled: boolean;
  signupByEmail: boolean;
  signupByPhone: boolean;
  signupByGoogle: boolean;
  deliveryCutoffHour: number;
  deliveryCutoffMinute: number;
  nextMorningMessage: string;
  sundayClosedMessage: string;
  notifySmsEnabled: boolean;
  notifyEmailEnabled: boolean;
  notifyPushEnabled: boolean;
  // Missed Order Phone Call Alert
  notifyCallEnabled?: boolean;
  adminCallPhone?: string;
  callMaxAttempts?: number; // default 3
  waitTimerMinutes: number;
  msgOnTheWay: string;
  msgArrivingSoon: string;
  msgArrived: string;
  updatedAt: string;
  coupons?: Record<string, MockCoupon>;
  flashDeals?: Record<string, MockFlashDeal>;
  telegramBotToken?: string;
  telegramChatId?: string;
  pushSubscription?: Record<string, unknown> | null;
  heroWeather?: HeroWeatherSettings;
  heroShowcase?: HeroShowcaseSettings;
  heroDisplayMode?: HeroDisplayMode;
}

interface StoreData {
  orders: Record<string, MockOrder>;
  products: Record<string, MockProduct> | null;
  users: Record<string, MockUser>;
  drivers: Record<string, MockDriver> | null;
  sessions: Record<string, string>;
  driverSessions: Record<string, string>;
  otpCodes: Record<string, { code: string; expires: number }>;
  coupons: Record<string, MockCoupon> | null;
  flashDeals: Record<string, MockFlashDeal> | null;
  bundleTiers: MockBundleTier[] | null;
  settings: StoreSettings | null;
  notifications: MockNotification[];
  counter: number;
}

function getDefaultCoupons(): Record<string, MockCoupon> {
  const seeds = [
    { id: "c1", code: "WELCOME10", type: "fixed" as const, value: 10, label: "$10 off your first order", minOrder: 50, maxUsage: null, usagePerCustomer: 1 },
    { id: "c2", code: "SUMMER15", type: "percentage" as const, value: 15, label: "15% off summer savings", minOrder: 40, maxUsage: 500, usagePerCustomer: null },
    { id: "c3", code: "SAVE20", type: "percentage" as const, value: 20, label: "20% off $100+ orders", minOrder: 100, maxUsage: 200, usagePerCustomer: null },
    { id: "c4", code: "CSL5", type: "fixed" as const, value: 5, label: "$5 off any order", minOrder: 25, maxUsage: null, usagePerCustomer: null },
    { id: "c5", code: "PARTY25", type: "percentage" as const, value: 25, label: "25% off party orders", minOrder: 150, maxUsage: 100, usagePerCustomer: null },
  ];
  const map: Record<string, MockCoupon> = {};
  for (const s of seeds) {
    map[s.id] = { ...s, usageCount: 0, active: true, startDate: null, endDate: null, categoryRestriction: null, createdAt: new Date("2024-01-01").toISOString() };
  }
  return map;
}

function getDefaultSettings(): StoreSettings {
  return {
    storeName: "Cold Spring Liquor",
    storeAddress: "15609 Ronald Reagan Blvd Ste B100, Leander, Texas 78641",
    storePhone: "(512) 337-7051",
    storeTextPhone: "(512) 720-2489",
    storeEmail: "info@coldspringliquor.com",
    websiteDomain: "coldspringliquor.com",
    businessHours: {
      Monday:    { open: "10:00", close: "21:00", closed: false },
      Tuesday:   { open: "10:00", close: "21:00", closed: false },
      Wednesday: { open: "10:00", close: "21:00", closed: false },
      Thursday:  { open: "10:00", close: "21:00", closed: false },
      Friday:    { open: "10:00", close: "21:00", closed: false },
      Saturday:  { open: "10:00", close: "21:00", closed: false },
      Sunday:    { open: "00:00", close: "00:00", closed: true },
    },
    deliveryRadius: 5,
    deliveryTimeMin: 10,
    deliveryTimeMax: 30,
    freeDeliveryEnabled: true,
    noTipRequired: true,
    minOrderAmount: 20,
    ageVerificationRequired: true,
    dobRequired: true,
    billingAddressRequired: true,
    deliveryAddressRequired: true,
    promoCodeEnabled: true,
    rewardsEnabled: true,
    orderNotesEnabled: true,
    newOrderSoundEnabled: true,
    newOrderPopupEnabled: true,
    newOrderBadgeEnabled: true,
    driverOnlineStatusEnabled: true,
    assignOnlineDriversOnly: true,
    salesTaxPercent: 8.25,
    onlinePaymentEnabled: true,
    cashOnDeliveryEnabled: false,
    stripePublishableKey: "",
    rewardClubName: "CS Reward Club",
    promoCodesEnabled: true,
    giftCodesEnabled: true,
    birthdayRewardEnabled: true,
    signupByEmail: true,
    signupByPhone: true,
    signupByGoogle: true,
    deliveryCutoffHour: 20,
    deliveryCutoffMinute: 30,
    nextMorningMessage: "Our store is near closing time. Your order will be prepared for the next business morning delivery.",
    sundayClosedMessage: "We are closed on Sunday. Your order will be prepared for Monday morning delivery.",
    notifySmsEnabled: true,
    notifyEmailEnabled: true,
    notifyPushEnabled: false,
    notifyCallEnabled: false,
    adminCallPhone: "(512) 720-2489",
    callMaxAttempts: 3,
    waitTimerMinutes: 5,
    msgOnTheWay: "Your Cold Spring Liquor driver is on the way. Please be ready to meet the driver and show your valid 21+ ID at delivery.",
    msgArrivingSoon: "Your Cold Spring Liquor driver is arriving soon. Please come outside or be ready at the door with your valid 21+ ID.",
    msgArrived: "Your Cold Spring Liquor driver has arrived. Please meet the driver now and show your valid 21+ ID.",
    heroWeather: { ...DEFAULT_HERO_WEATHER, rain: { ...DEFAULT_HERO_WEATHER.rain }, lightning: { ...DEFAULT_HERO_WEATHER.lightning } },
    heroShowcase: JSON.parse(JSON.stringify(DEFAULT_HERO_SHOWCASE)),
    heroDisplayMode: DEFAULT_HERO_DISPLAY_MODE,
    updatedAt: new Date().toISOString(),
  };
}

function getDefaultFlashDeals(): Record<string, MockFlashDeal> {
  const now = Date.now();
  const seeds: MockFlashDeal[] = [
    { id: "fd1", name: "Casamigos Blanco Tequila", brand: "Casamigos", slug: "casamigos-blanco-tequila", price: 54.99, salePrice: 39.99, imageUrl: null, volume: "750ml", stockQty: 8, maxStock: 8, active: true, startAt: null, endsAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(), createdAt: new Date().toISOString() },
    { id: "fd2", name: "Tito's Handmade Vodka", brand: "Tito's", slug: "titos-handmade-vodka", price: 32.99, salePrice: 24.99, imageUrl: null, volume: "1L", stockQty: 15, maxStock: 15, active: true, startAt: null, endsAt: new Date(now + 4 * 60 * 60 * 1000).toISOString(), createdAt: new Date().toISOString() },
    { id: "fd3", name: "Jameson Irish Whiskey", brand: "Jameson", slug: "jameson-irish-whiskey", price: 39.99, salePrice: 29.99, imageUrl: null, volume: "750ml", stockQty: 5, maxStock: 5, active: true, startAt: null, endsAt: new Date(now + 6 * 60 * 60 * 1000).toISOString(), createdAt: new Date().toISOString() },
  ];
  return Object.fromEntries(seeds.map(d => [d.id, d]));
}

function getDefaultBundleTiers(): MockBundleTier[] {
  return [
    { id: "bt1", minQty: 2, discountPct: 5, label: "Buy 2+ bottles — Save 5%", active: true, sortOrder: 1 },
    { id: "bt2", minQty: 3, discountPct: 10, label: "Buy 3+ bottles — Save 10%", active: true, sortOrder: 2 },
    { id: "bt3", minQty: 6, discountPct: 15, label: "Buy 6+ bottles — Save 15%", active: true, sortOrder: 3 },
  ];
}

function read(): StoreData {
  try {
    const raw = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
    return { users: {}, sessions: {}, drivers: null, driverSessions: {}, otpCodes: {}, coupons: null, flashDeals: null, bundleTiers: null, settings: null, notifications: [], ...raw };
  } catch {
    return { orders: {}, products: null, users: {}, drivers: null, sessions: {}, driverSessions: {}, otpCodes: {}, coupons: null, flashDeals: null, bundleTiers: null, settings: null, notifications: [], counter: 100 };
  }
}

function write(data: StoreData) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
}

function getDefaultProducts(): Record<string, MockProduct> {
  const map: Record<string, MockProduct> = {};
  for (const p of PRODUCTS) map[p.id] = { ...p, active: true } as MockProduct;
  return map;
}

function getDefaultDrivers(): Record<string, MockDriver> {
  const map: Record<string, MockDriver> = {};
  const seeds = [
    { id: "d1", name: "Marcus T.", phone: "5124441001", email: "marcus@csl.com", username: "marcus", pin: "1234", lat: 30.5786, lng: -97.8536, totalDeliveries: 142, totalEarnings: 1842.50, rating: 4.9, isOnline: false },
    { id: "d2", name: "Sarah J.", phone: "5124441002", email: "sarah@csl.com", username: "sarah", pin: "5678", lat: 30.5786, lng: -97.8536, totalDeliveries: 87, totalEarnings: 1103.00, rating: 4.8, isOnline: false },
    { id: "d3", name: "James R.", phone: "5124441003", email: "james@csl.com", username: "james", pin: "9012", lat: null, lng: null, totalDeliveries: 203, totalEarnings: 2641.00, rating: 4.7, isOnline: false },
  ];
  for (const s of seeds) {
    map[s.id] = {
      ...s, active: true, passwordHash: Buffer.from("password").toString("base64"),
      locationUpdatedAt: null, currentOrderId: null, createdAt: new Date("2024-01-01").toISOString(),
    };
  }
  return map;
}

function mockHash(s: string) { return Buffer.from(s).toString("base64"); }

export const store = {
  // ── Orders ──────────────────────────────────────────────────────────────────
  getOrder(id: string): MockOrder | undefined { return read().orders[id]; },
  getAllOrders(): MockOrder[] {
    return Object.values(read().orders).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
  getOrdersByCustomer(customerId: string): MockOrder[] {
    return this.getAllOrders().filter(o => o.customerId === customerId);
  },
  getOrdersByDriver(driverId: string): MockOrder[] {
    return this.getAllOrders().filter(o => o.driverId === driverId);
  },
  saveOrder(order: MockOrder): void {
    const data = read(); data.orders[order.id] = order; write(data);
  },
  updateOrderStatus(id: string, status: OrderStatus, extra?: Partial<MockOrder>): MockOrder | undefined {
    const data = read(); const order = data.orders[id];
    if (!order) return undefined;
    order.status = status; order.updatedAt = new Date().toISOString();
    if (extra) Object.assign(order, extra);
    write(data); return order;
  },
  nextCounter(): number {
    const data = read(); data.counter++; write(data); return data.counter;
  },

  // ── Products ─────────────────────────────────────────────────────────────────
  getAllProducts(): MockProduct[] {
    const data = read();
    const prods = data.products ?? getDefaultProducts();
    if (!data.products) { data.products = prods; write(data); }
    return Object.values(prods);
  },
  getProduct(idOrSlug: string): MockProduct | undefined {
    return this.getAllProducts().find(p => p.id === idOrSlug || p.slug === idOrSlug);
  },
  saveProduct(product: MockProduct): void {
    const data = read();
    if (!data.products) data.products = getDefaultProducts();
    data.products[product.id] = product; write(data);
  },
  deleteProduct(id: string): boolean {
    const data = read();
    if (!data.products) data.products = getDefaultProducts();
    if (!data.products[id]) return false;
    delete data.products[id]; write(data); return true;
  },

  // ── Users ────────────────────────────────────────────────────────────────────
  getUserByEmail(email: string): MockUser | undefined {
    return Object.values(read().users).find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  getUserById(id: string): MockUser | undefined { return read().users[id]; },
  createUser(fields: Omit<MockUser, "id"|"points"|"tier"|"createdAt"|"passwordHash"> & { password: string }): MockUser {
    const data = read(); const id = `u${Date.now()}`;
    const user: MockUser = { id, name: fields.name, email: fields.email, phone: fields.phone,
      dob: fields.dob, passwordHash: mockHash(fields.password), points: 50, tier: "Bronze",
      createdAt: new Date().toISOString() };
    data.users[id] = user; write(data); return user;
  },
  validatePassword(user: MockUser, password: string): boolean {
    return user.passwordHash === mockHash(password);
  },
  updateUserPoints(id: string, delta: number): MockUser | undefined {
    const data = read(); const user = data.users[id]; if (!user) return undefined;
    user.points = Math.max(0, user.points + delta);
    if (user.points >= 3000) user.tier = "Platinum";
    else if (user.points >= 1500) user.tier = "Gold";
    else if (user.points >= 500) user.tier = "Silver";
    else user.tier = "Bronze";
    write(data); return user;
  },
  createSession(userId: string): string {
    const data = read();
    const token = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    data.sessions[token] = userId; write(data); return token;
  },
  getUserBySession(token: string): MockUser | undefined {
    const data = read(); const userId = data.sessions[token];
    return userId ? data.users[userId] : undefined;
  },
  deleteSession(token: string): void {
    const data = read(); delete data.sessions[token]; write(data);
  },
  updateUserProfile(id: string, fields: Partial<Pick<MockUser, "name"|"phone"|"email"|"dob"|"deliveryAddress"|"billingAddress"|"billingAddressSameAsDelivery">>): MockUser | undefined {
    const data = read(); const user = data.users[id]; if (!user) return undefined;
    Object.assign(user, fields); write(data); return user;
  },
  updateUserCart(id: string, cart: MockUser["savedCart"]): MockUser | undefined {
    const data = read(); const user = data.users[id]; if (!user) return undefined;
    user.savedCart = cart; write(data); return user;
  },
  getUserByPhone(phone: string): MockUser | undefined {
    const clean = phone.replace(/\D/g, "");
    return Object.values(read().users).find(u => u.phone.replace(/\D/g, "") === clean);
  },
  getUserByGoogleId(googleId: string): MockUser | undefined {
    return Object.values(read().users).find(u => u.googleId === googleId);
  },
  createOrUpdateGoogleUser(fields: { googleId: string; name: string; email: string }): MockUser {
    const data = read();
    let user = Object.values(data.users).find(u => u.googleId === fields.googleId || u.email === fields.email);
    if (user) {
      user.googleId = fields.googleId;
      user.name = fields.name;
      write(data);
    } else {
      const id = `u${Date.now()}`;
      user = { id, name: fields.name, email: fields.email, phone: "", dob: "", passwordHash: "", points: 50, tier: "Bronze", createdAt: new Date().toISOString(), googleId: fields.googleId };
      data.users[id] = user;
      write(data);
    }
    return user;
  },
  // OTP
  generateOTP(phone: string): string {
    const data = read();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    if (!data.otpCodes) data.otpCodes = {};
    data.otpCodes[phone.replace(/\D/g, "")] = { code, expires: Date.now() + 5 * 60 * 1000 };
    write(data); return code;
  },
  verifyOTP(phone: string, code: string): boolean {
    const data = read();
    const entry = (data.otpCodes ?? {})[phone.replace(/\D/g, "")];
    if (!entry || entry.expires < Date.now()) return false;
    if (entry.code !== code) return false;
    delete data.otpCodes[phone.replace(/\D/g, "")];
    write(data); return true;
  },

  // ── Drivers ──────────────────────────────────────────────────────────────────
  getAllDrivers(): MockDriver[] {
    const data = read();
    const drivers = data.drivers ?? getDefaultDrivers();
    if (!data.drivers) { data.drivers = drivers; write(data); }
    return Object.values(drivers);
  },
  getDriver(id: string): MockDriver | undefined {
    return this.getAllDrivers().find(d => d.id === id);
  },
  getDriverByUsername(username: string): MockDriver | undefined {
    return this.getAllDrivers().find(d => d.username.toLowerCase() === username.toLowerCase());
  },
  createDriver(fields: Omit<MockDriver, "id"|"passwordHash"|"isOnline"|"lat"|"lng"|"locationUpdatedAt"|"currentOrderId"|"totalDeliveries"|"totalEarnings"|"rating"|"createdAt">): MockDriver {
    const data = read();
    if (!data.drivers) data.drivers = getDefaultDrivers();
    const id = `d${Date.now()}`;
    const driver: MockDriver = {
      id, name: fields.name, phone: fields.phone, email: fields.email,
      username: fields.username, pin: fields.pin,
      passwordHash: mockHash(fields.pin), active: fields.active ?? true,
      isOnline: false, lat: null, lng: null, locationUpdatedAt: null,
      currentOrderId: null, totalDeliveries: 0, totalEarnings: 0, rating: 5.0,
      createdAt: new Date().toISOString(),
    };
    data.drivers[id] = driver; write(data); return driver;
  },
  updateDriver(id: string, fields: Partial<MockDriver>): MockDriver | undefined {
    const data = read();
    if (!data.drivers) data.drivers = getDefaultDrivers();
    const driver = data.drivers[id]; if (!driver) return undefined;
    Object.assign(driver, fields); write(data); return driver;
  },
  deleteDriver(id: string): boolean {
    const data = read();
    if (!data.drivers) data.drivers = getDefaultDrivers();
    if (!data.drivers[id]) return false;
    delete data.drivers[id]; write(data); return true;
  },
  updateDriverLocation(id: string, lat: number, lng: number): MockDriver | undefined {
    const data = read();
    if (!data.drivers) data.drivers = getDefaultDrivers();
    const driver = data.drivers[id]; if (!driver) return undefined;
    driver.lat = lat; driver.lng = lng;
    driver.locationUpdatedAt = new Date().toISOString();
    write(data); return driver;
  },
  setDriverOnline(id: string, isOnline: boolean): MockDriver | undefined {
    return this.updateDriver(id, { isOnline });
  },
  createDriverSession(driverId: string): string {
    const data = read();
    const token = `drv-${driverId}-${Date.now()}`;
    data.driverSessions[token] = driverId; write(data); return token;
  },
  getDriverBySession(token: string): MockDriver | undefined {
    const data = read(); const driverId = data.driverSessions[token];
    return driverId ? this.getDriver(driverId) : undefined;
  },
  validateDriverPin(username: string, pin: string): MockDriver | undefined {
    const driver = this.getDriverByUsername(username);
    if (driver && driver.pin === pin) return driver;
    return undefined;
  },

  // ── Coupons ──────────────────────────────────────────────────────────────────
  getAllCoupons(): MockCoupon[] {
    const data = read();
    const coupons = data.coupons ?? getDefaultCoupons();
    if (!data.coupons) { data.coupons = coupons; write(data); }
    return Object.values(coupons).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  getCouponByCode(code: string): MockCoupon | undefined {
    return this.getAllCoupons().find(c => c.code.toUpperCase() === code.toUpperCase());
  },
  createCoupon(fields: Omit<MockCoupon, "id" | "usageCount" | "createdAt">): MockCoupon {
    const data = read();
    if (!data.coupons) data.coupons = getDefaultCoupons();
    const id = `c${Date.now()}`;
    const coupon: MockCoupon = { id, usageCount: 0, createdAt: new Date().toISOString(), ...fields };
    data.coupons[id] = coupon; write(data); return coupon;
  },
  updateCoupon(id: string, fields: Partial<MockCoupon>): MockCoupon | undefined {
    const data = read();
    if (!data.coupons) data.coupons = getDefaultCoupons();
    const coupon = data.coupons[id]; if (!coupon) return undefined;
    Object.assign(coupon, fields); write(data); return coupon;
  },
  deleteCoupon(id: string): boolean {
    const data = read();
    if (!data.coupons) data.coupons = getDefaultCoupons();
    if (!data.coupons[id]) return false;
    delete data.coupons[id]; write(data); return true;
  },
  incrementCouponUsage(code: string): void {
    const data = read();
    if (!data.coupons) data.coupons = getDefaultCoupons();
    const coupon = Object.values(data.coupons).find(c => c.code.toUpperCase() === code.toUpperCase());
    if (coupon) { coupon.usageCount++; write(data); }
  },

  // ── Notifications ─────────────────────────────────────────────────────────────
  createNotification(fields: Omit<MockNotification, "id" | "read" | "createdAt">): MockNotification {
    const data = read();
    if (!data.notifications) data.notifications = [];
    const notif: MockNotification = {
      id: `n${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      read: false,
      createdAt: new Date().toISOString(),
      ...fields,
    };
    data.notifications.push(notif);
    // Keep only last 200 notifications
    if (data.notifications.length > 200) data.notifications = data.notifications.slice(-200);
    write(data);
    return notif;
  },
  getNotificationsForCustomer(customerId: string): MockNotification[] {
    const data = read();
    return (data.notifications ?? [])
      .filter(n => n.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  markNotificationsRead(customerId: string): void {
    const data = read();
    if (!data.notifications) return;
    data.notifications.forEach(n => { if (n.customerId === customerId) n.read = true; });
    write(data);
  },

  // ── Settings ─────────────────────────────────────────────────────────────────
  getSettings(): StoreSettings {
    const data = read();
    const settings = data.settings ?? getDefaultSettings();
    if (!data.settings) { data.settings = settings; write(data); }
    return settings;
  },
  saveSettings(fields: Partial<StoreSettings>): StoreSettings {
    const data = read();
    const current = data.settings ?? getDefaultSettings();
    const updated = { ...current, ...fields, updatedAt: new Date().toISOString() };
    data.settings = updated; write(data); return updated;
  },
  resetSettings(): StoreSettings {
    const data = read();
    const defaults = getDefaultSettings();
    data.settings = defaults; write(data); return defaults;
  },

  // ── Flash Deals ───────────────────────────────────────────────────────────────
  getAllFlashDeals(): MockFlashDeal[] {
    const data = read();
    const deals = data.flashDeals ?? getDefaultFlashDeals();
    if (!data.flashDeals) { data.flashDeals = deals; write(data); }
    return Object.values(deals).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  getActiveFlashDeals(): MockFlashDeal[] {
    const now = new Date();
    return this.getAllFlashDeals().filter(d => {
      if (!d.active) return false;
      if (d.startAt && new Date(d.startAt) > now) return false;
      if (d.endsAt && new Date(d.endsAt) < now) return false;
      return true;
    });
  },
  createFlashDeal(fields: Omit<MockFlashDeal, "id" | "createdAt">): MockFlashDeal {
    const data = read();
    if (!data.flashDeals) data.flashDeals = getDefaultFlashDeals();
    const id = `fd${Date.now()}`;
    const deal: MockFlashDeal = { id, createdAt: new Date().toISOString(), ...fields };
    data.flashDeals[id] = deal; write(data); return deal;
  },
  updateFlashDeal(id: string, fields: Partial<MockFlashDeal>): MockFlashDeal | undefined {
    const data = read();
    if (!data.flashDeals) data.flashDeals = getDefaultFlashDeals();
    const deal = data.flashDeals[id]; if (!deal) return undefined;
    Object.assign(deal, fields); write(data); return deal;
  },
  deleteFlashDeal(id: string): boolean {
    const data = read();
    if (!data.flashDeals) data.flashDeals = getDefaultFlashDeals();
    if (!data.flashDeals[id]) return false;
    delete data.flashDeals[id]; write(data); return true;
  },

  // ── Bundle Tiers ──────────────────────────────────────────────────────────────
  getAllBundleTiers(): MockBundleTier[] {
    const data = read();
    const tiers = data.bundleTiers ?? getDefaultBundleTiers();
    if (!data.bundleTiers) { data.bundleTiers = tiers; write(data); }
    return tiers.sort((a, b) => a.sortOrder - b.sortOrder);
  },
  getActiveBundleTiers(): MockBundleTier[] {
    return this.getAllBundleTiers().filter(t => t.active);
  },
  createBundleTier(fields: Omit<MockBundleTier, "id">): MockBundleTier {
    const data = read();
    if (!data.bundleTiers) data.bundleTiers = getDefaultBundleTiers();
    const id = `bt${Date.now()}`;
    const tier: MockBundleTier = { id, ...fields };
    data.bundleTiers.push(tier); write(data); return tier;
  },
  updateBundleTier(id: string, fields: Partial<MockBundleTier>): MockBundleTier | undefined {
    const data = read();
    if (!data.bundleTiers) data.bundleTiers = getDefaultBundleTiers();
    const tier = data.bundleTiers.find(t => t.id === id); if (!tier) return undefined;
    Object.assign(tier, fields); write(data); return tier;
  },
  deleteBundleTier(id: string): boolean {
    const data = read();
    if (!data.bundleTiers) data.bundleTiers = getDefaultBundleTiers();
    const idx = data.bundleTiers.findIndex(t => t.id === id); if (idx === -1) return false;
    data.bundleTiers.splice(idx, 1); write(data); return true;
  },

  clear(): void {
    write({ orders: {}, products: null, users: {}, drivers: null, sessions: {}, driverSessions: {}, otpCodes: {}, coupons: null, flashDeals: null, bundleTiers: null, settings: null, notifications: [], counter: 100 });
  },
};

const ORDER_NUM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createOrderNumber(): string {
  return Array.from(
    { length: 6 },
    () => ORDER_NUM_CHARS[Math.floor(Math.random() * ORDER_NUM_CHARS.length)]
  ).join("");
}
