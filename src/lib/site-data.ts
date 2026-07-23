export const navItems = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Games" },
  { href: "/games?category=hot", label: "Hot Games" },
  { href: "/games?category=favorites", label: "Favorites" },
  { href: "/promotions", label: "Promotions" },
  { href: "/vip", label: "VIP" },
  { href: "/account", label: "Account" },
];

export interface HeroSlide {
  id: number;
  kicker: string;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  image: string;
  destination: string;
  requiresLogin: boolean;
  queryParams?: string;
}

export const heroSlides: HeroSlide[] = [
  {
    id: 1,
    kicker: "WELCOME BONUS",
    title: "200% Welcome Bonus",
    subtitle: "New players receive a massive welcome package.",
    description: "New players receive a massive welcome package. Deposit now and claim your bonus to start winning immediately.",
    cta: "Claim Bonus",
    image: "/Hero-Banner.png",
    destination: "/deposit",
    requiresLogin: true,
    queryParams: "claimBonus=true",
  },
  {
    id: 2,
    kicker: "VIP REWARDS",
    title: "VIP Casino Experience",
    subtitle: "Exclusive VIP Rewards + Birthday Gift",
    description: "Exclusive VIP rewards, birthday gifts, and personal account manager. Join the elite today.",
    cta: "Become VIP",
    image: "/Hero-Banner.png",
    destination: "/vip",
    requiresLogin: true,
  },
  {
    id: 3,
    kicker: "DAILY CASHBACK",
    title: "Cashback up to 15%",
    subtitle: "Recover part of your losses every day.",
    description: "Get up to 15% cashback on your net losses every single day. No limits, no restrictions.",
    cta: "View Cashback",
    image: "/Hero-Banner.png",
    destination: "/promotions",
    requiresLogin: false,
  },
  {
    id: 4,
    kicker: "MEGA JACKPOTS",
    title: "Life Changing Wins",
    subtitle: "Your next spin could change your life.",
    description: "Progressive jackpots, daily tournaments, and exclusive rewards. Your next spin could change everything.",
    cta: "Play Now",
    image: "/Hero-Banner.png",
    destination: "/games",
    requiresLogin: true,
  },
];

/**
 * Game Category Menu – now provider-based.
 * Hot Games and Favorites remain; the rest are game providers.
 * When clicked, the provider name is used to filter games from /api/games?provider={name}.
 */
export const gameCategories = [
  { id: "hot", label: "🔥 Hot Games", slug: "hot" },
  { id: "favorites", label: "⭐ Favorites", slug: "favorites" },
  { id: "playngo", label: "Play'n GO", slug: "Play'n GO" },
  { id: "pragmatic-play", label: "Pragmatic Play", slug: "Pragmatic Play" },
  { id: "hacksaw-gaming", label: "Hacksaw Gaming", slug: "Hacksaw Gaming" },
  { id: "spribe", label: "Spribe", slug: "Spribe" },
  { id: "vgames", label: "vGames", slug: "vGames" },
  { id: "wave-originals", label: "Wave Originals", slug: "Wave Originals" },
];

/** @deprecated Use gameCategories instead */
export const lobbyCategories = gameCategories;

// Keep only the static showcase for provider detail pages
export const providerShowcase: Array<{
  name: string;
  slug: string;
  established: string;
  games: string[];
  description: string;
  features: string[];
}> = [
  {
    name: "JILI",
    slug: "jili",
    established: "2015",
    games: ["Slots", "Fishing", "Arcade"],
    description: "Leading Asian game provider with innovative slot and fishing games.",
    features: ["High RTP", "Mobile Optimized", "Quick Games"],
  },
  {
    name: "PG Soft",
    slug: "pg-soft",
    established: "2015",
    games: ["Slots", "Table Games"],
    description: "Mobile-first slot games with stunning graphics.",
    features: ["Mobile First", "Innovative Mechanics", "High Quality"],
  },
  {
    name: "Pragmatic Play",
    slug: "pragmatic-play",
    established: "2015",
    games: ["Slots", "Live Casino", "Sports"],
    description: "Multi-product provider with award-winning slots and live casino.",
    features: ["Award Winning", "Live Casino", "Tournaments"],
  },
  {
    name: "Evolution",
    slug: "evolution",
    established: "2006",
    games: ["Live Casino", "Game Shows"],
    description: "World leader in live casino and game show entertainment.",
    features: ["HD Streaming", "Professional Dealers", "Game Shows"],
  },
  {
    name: "CQ9",
    slug: "cq9",
    established: "2016",
    games: ["Slots", "Arcade"],
    description: "Creative game developer known for unique slot mechanics.",
    features: ["Creative Themes", "Bonus Features", "Fast Payouts"],
  },
  {
    name: "JDB",
    slug: "jdb",
    established: "2014",
    games: ["Slots", "Fishing"],
    description: "Specialized in fishing games and classic slots.",
    features: ["Fishing Games", "Classic Slots", "Low Volatility"],
  },
  {
    name: "FC",
    slug: "fc",
    established: "2017",
    games: ["Slots", "Sports"],
    description: "Sports-themed games and innovative slot mechanics.",
    features: ["Sports Themes", "Interactive", "Bonus Rounds"],
  },
  {
    name: "KA Gaming",
    slug: "ka-gaming",
    established: "2014",
    games: ["Slots", "Fishing", "Lottery"],
    description: "Diverse game portfolio with Asian market focus.",
    features: ["Diverse Portfolio", "Asian Themes", "Lottery Games"],
  },
  {
    name: "Spribe",
    slug: "spribe",
    established: "2018",
    games: ["Arcade", "Crash"],
    description: "Innovator of crash games and provably fair arcade titles.",
    features: ["Provably Fair", "Crash Games", "Innovative"],
  },
  {
    name: "Microgaming",
    slug: "microgaming",
    established: "1994",
    games: ["Slots", "Table Games", "Progressive"],
    description: "Pioneer of online gaming with massive progressive jackpots.",
    features: ["Progressive Jackpots", "Classic Titles", "Industry Leader"],
  },
  {
    name: "Playtech",
    slug: "playtech",
    established: "1999",
    games: ["Slots", "Live Casino", "Sports"],
    description: "Omni-channel gaming solutions provider.",
    features: ["Omni-Channel", "Live Casino", "Sports Betting"],
  },
  {
    name: "NetEnt",
    slug: "netent",
    established: "1996",
    games: ["Slots", "Table Games"],
    description: "Slot developer known for innovative features.",
    features: ["Innovative Slots", "High Quality", "Branded Games"],
  },
];

export const announcements = [
  "🎉 Welcome bonus: 100% match up to ₱10,000 + 50 free spins!",
  "🔥 Daily cashback: Get 10% back on net losses every day!",
  "👑 VIP Rewards: Exclusive bonuses, faster withdrawals, personal manager.",
  "💎 Refer a friend: Earn ₱500 for every successful referral!",
];

export const missions = [
  { title: "Daily Login", progress: 100, reward: "₱50 Bonus" },
  { title: "Deposit Today", progress: 60, reward: "Free Spins x10" },
  { title: "Play 10 Games", progress: 40, reward: "₱100 Cashback" },
  { title: "Refer a Friend", progress: 0, reward: "₱500 Bonus" },
  { title: "VIP Points", progress: 75, reward: "₱250 Bonus" },
  { title: "Win Streak", progress: 30, reward: "₱200 Cashback" },
];

export const leaderboard = [
  { name: "Player_001", rank: 1, metric: "₱2,450,000 won" },
  { name: "LuckyStar", rank: 2, metric: "₱1,890,000 won" },
  { name: "JackpotKing", rank: 3, metric: "₱1,250,000 won" },
  { name: "GoldRush", rank: 4, metric: "₱980,000 won" },
  { name: "MegaWin", rank: 5, metric: "₱750,000 won" },
  { name: "FortuneHunter", rank: 6, metric: "₱620,000 won" },
  { name: "SpinMaster", rank: 7, metric: "₱510,000 won" },
  { name: "RoyalFlush", rank: 8, metric: "₱420,000 won" },
];

export const jackpot = {
  amount: 12500000,
  currency: "PHP",
  label: "Progressive Jackpot",
};