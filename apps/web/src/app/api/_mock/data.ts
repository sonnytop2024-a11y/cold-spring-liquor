export const PRODUCTS = [
  {
    id: "p1", slug: "jack-daniels-old-no-7", name: "Jack Daniel's Old No. 7",
    brand: "Jack Daniel's", category: "whiskey", price: 34.99, salePrice: null,
    volume: "750ml", abv: 40, country: "USA", stockQty: 48,
    inStock: true, featured: true, rating: 4.8, reviewCount: 2341,
    description: "The world's best-selling American whiskey. Smooth, mellow character from charcoal mellowing.",
    imageUrl: null,
  },
  {
    id: "p2", slug: "casamigos-blanco-tequila", name: "Casamigos Blanco Tequila",
    brand: "Casamigos", category: "tequila", price: 54.99, salePrice: 44.99,
    volume: "750ml", abv: 40, country: "Mexico", stockQty: 8,
    inStock: true, featured: true, rating: 4.9, reviewCount: 1876,
    description: "Ultra-premium tequila co-founded by George Clooney. Crisp, clean and smooth.",
    imageUrl: null,
  },
  {
    id: "p3", slug: "titos-handmade-vodka", name: "Tito's Handmade Vodka",
    brand: "Tito's", category: "vodka", price: 32.99, salePrice: null,
    volume: "750ml", abv: 40, country: "USA", stockQty: 62,
    inStock: true, featured: true, rating: 4.7, reviewCount: 3102,
    description: "America's original craft vodka, distilled and bottled in Austin, Texas.",
    imageUrl: null,
  },
  {
    id: "p4", slug: "jameson-irish-whiskey", name: "Jameson Irish Whiskey",
    brand: "Jameson", category: "whiskey", price: 39.99, salePrice: 29.99,
    volume: "750ml", abv: 40, country: "Ireland", stockQty: 5,
    inStock: true, featured: true, rating: 4.7, reviewCount: 2987,
    description: "Triple distilled for extra smoothness. World's best-selling Irish whiskey.",
    imageUrl: null,
  },
  {
    id: "p5", slug: "modelo-especial-12pk", name: "Modelo Especial 12-Pack",
    brand: "Modelo", category: "beer", price: 19.99, salePrice: null,
    volume: "12 x 355ml", abv: 4.4, country: "Mexico", stockQty: 30,
    inStock: true, featured: false, rating: 4.6, reviewCount: 4521,
    description: "A rich, full-flavored pilsner-style lager. Specially brewed for a superior taste.",
    imageUrl: null,
  },
  {
    id: "p6", slug: "kim-crawford-sauvignon-blanc", name: "Kim Crawford Sauvignon Blanc",
    brand: "Kim Crawford", category: "wine", price: 17.99, salePrice: null,
    volume: "750ml", abv: 12.5, country: "New Zealand", stockQty: 24,
    inStock: true, featured: false, rating: 4.5, reviewCount: 1654,
    description: "Vibrant, crisp and refreshing. Aromas of tropical fruit with a clean citrus finish.",
    imageUrl: null,
  },
  {
    id: "p7", slug: "clase-azul-reposado", name: "Clase Azul Reposado Tequila",
    brand: "Clase Azul", category: "tequila", price: 169.99, salePrice: null,
    volume: "750ml", abv: 40, country: "Mexico", stockQty: 6,
    inStock: true, featured: true, rating: 5.0, reviewCount: 892,
    description: "Aged 8 months in American oak barrels. Extraordinary smoothness in iconic hand-crafted decanter.",
    imageUrl: null,
  },
  {
    id: "p8", slug: "woodford-reserve-bourbon", name: "Woodford Reserve Bourbon",
    brand: "Woodford Reserve", category: "whiskey", price: 44.99, salePrice: null,
    volume: "750ml", abv: 45.2, country: "USA", stockQty: 18,
    inStock: true, featured: true, rating: 4.8, reviewCount: 1423,
    description: "Kentucky's finest small batch bourbon. Rich, full body with complex notes of dried fruit and spice.",
    imageUrl: null,
  },
  {
    id: "p9", slug: "blue-moon-6pk", name: "Blue Moon Belgian White 6-Pack",
    brand: "Blue Moon", category: "beer", price: 11.99, salePrice: null,
    volume: "6 x 355ml", abv: 5.4, country: "USA", stockQty: 40,
    inStock: true, featured: false, rating: 4.4, reviewCount: 2876,
    description: "Refreshing wheat ale brewed with orange peel and coriander for a smooth, citrusy taste.",
    imageUrl: null,
  },
  {
    id: "p10", slug: "josh-cabernet-sauvignon", name: "Josh Cellars Cabernet Sauvignon",
    brand: "Josh Cellars", category: "wine", price: 14.99, salePrice: null,
    volume: "750ml", abv: 13.5, country: "USA", stockQty: 35,
    inStock: true, featured: false, rating: 4.5, reviewCount: 2134,
    description: "Dark fruit aromas of black cherry and blackberry with toasted oak and hints of mocha.",
    imageUrl: null,
  },
  {
    id: "p11", slug: "grey-goose-vodka", name: "Grey Goose Vodka",
    brand: "Grey Goose", category: "vodka", price: 45.99, salePrice: 38.99,
    volume: "750ml", abv: 40, country: "France", stockQty: 20,
    inStock: true, featured: false, rating: 4.7, reviewCount: 1987,
    description: "Made with French wheat and natural spring water from Gensac-la-Pallue.",
    imageUrl: null,
  },
  {
    id: "p12", slug: "hennessy-vs-cognac", name: "Hennessy VS Cognac",
    brand: "Hennessy", category: "cognac", price: 39.99, salePrice: null,
    volume: "750ml", abv: 40, country: "France", stockQty: 22,
    inStock: true, featured: true, rating: 4.8, reviewCount: 3241,
    description: "A blend of 40 eaux-de-vie aged in French oak barrels. Bold, fruity and slightly sweet.",
    imageUrl: null,
  },
];

export const MOCK_DRIVERS = [
  { id: "d1", isOnline: true, currentOrderId: null, totalDeliveries: 142, totalEarnings: 1842.50, rating: 4.9, user: { displayName: "Marcus T.", email: "marcus@csl.com" }, lat: 30.5786, lng: -97.8536 },
  { id: "d2", isOnline: true, currentOrderId: null, totalDeliveries: 87, totalEarnings: 1103.00, rating: 4.8, user: { displayName: "Sarah J.", email: "sarah@csl.com" }, lat: 30.5786, lng: -97.8536 },
  { id: "d3", isOnline: false, currentOrderId: null, totalDeliveries: 203, totalEarnings: 2641.00, rating: 4.7, user: { displayName: "James R.", email: "james@csl.com" }, lat: 30.5786, lng: -97.8536 },
];

export const MOCK_CUSTOMERS = [
  { id: "c1", displayName: "Alex Chen", email: "alex@example.com", createdAt: "2024-01-15", orderCount: 12, rewards: { totalPoints: 840, totalSpend: 840, vipTier: "silver" } },
  { id: "c2", displayName: "Maria Lopez", email: "maria@example.com", createdAt: "2024-02-20", orderCount: 34, rewards: { totalPoints: 2100, totalSpend: 2100, vipTier: "gold" } },
  { id: "c3", displayName: "Tom Wilson", email: "tom@example.com", createdAt: "2024-03-10", orderCount: 7, rewards: { totalPoints: 320, totalSpend: 320, vipTier: null } },
  { id: "c4", displayName: "Jenny Park", email: "jenny@example.com", createdAt: "2024-04-05", orderCount: 58, rewards: { totalPoints: 4200, totalSpend: 4200, vipTier: "platinum" } },
];

export const FLASH_DEALS = [
  { id: "f1", name: "Casamigos Blanco Tequila", brand: "Casamigos", slug: "casamigos-blanco-tequila", price: 54.99, salePrice: 39.99, imageUrl: null, volume: "750ml", stockQty: 8, inStock: true, endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
  { id: "f2", name: "Tito's Handmade Vodka", brand: "Tito's", slug: "titos-handmade-vodka", price: 32.99, salePrice: 24.99, imageUrl: null, volume: "1L", stockQty: 15, inStock: true, endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() },
  { id: "f3", name: "Jameson Irish Whiskey", brand: "Jameson", slug: "jameson-irish-whiskey", price: 39.99, salePrice: 29.99, imageUrl: null, volume: "750ml", stockQty: 5, inStock: true, endsAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() },
];

// Texas 8.25% tax, always $0 delivery
export const TAX_RATE = 0.0825;
export const STORE_LAT = 30.5786;
export const STORE_LNG = -97.8536;
export const SERVICE_CITIES = ["leander", "cedar park", "liberty hill"];
