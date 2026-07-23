"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  GiftIcon,
  FireIcon,
  StarIcon,
  UsersIcon,
  SparklesIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";

interface Promotion {
  id: string;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  color: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  action: "link" | "disabled";
  href?: string;
  queryParams?: string;
  disabled?: boolean;
  buttonText: string;
}

const promotions: Promotion[] = [
  {
    id: "welcome-bonus",
    badge: "NEW",
    badgeColor: "bg-gold text-black",
    title: "Welcome Bonus Up to 200%",
    subtitle: "Get up to a 200% Deposit Bonus on your first deposit.",
    description:
      "Make your first deposit and receive up to a 200% bonus based on the active promotion. Deposit Bonus must be selected during deposit.",
    image: "/Hero-Banner.png",
    color: "from-gold/25 to-red/15",
    icon: GiftIcon,
    action: "link",
    href: "/deposit",
    queryParams: "claimBonus=true",
    buttonText: "Deposit Now",
  },
  {
    id: "daily-cashback",
    badge: "Daily",
    badgeColor: "bg-red text-white",
    title: "Daily Cashback Up to 3%",
    subtitle: "Receive cashback every day based on your valid losses.",
    description:
      "Earn up to 3% Daily Cashback automatically according to the promotion rules.",
    image: "/Hero-Banner.png",
    color: "from-red/25 to-gold/10",
    icon: FireIcon,
    action: "link",
    href: "#",
    buttonText: "View Cashback",
  },
  {
    id: "referral",
    badge: "Popular",
    badgeColor: "bg-emerald-500 text-white",
    title: "Referral Rewards",
    subtitle: "₱50 Per Valid Referral",
    description:
      "Invite your friends using your personal referral link. Receive ₱50 for every valid referral that completes the required deposit.",
    image: "/Hero-Banner.png",
    color: "from-emerald-500/20 to-gold/10",
    icon: UsersIcon,
    action: "link",
    href: "/referral",
    buttonText: "Invite Friends",
  },
  {
    id: "vip",
    badge: "VIP",
    badgeColor: "bg-purple-500 text-white",
    title: "VIP Bonuses",
    subtitle: "Exclusive VIP Rewards",
    description:
      "Unlock VIP Levels, Birthday Gifts, Weekly Rewards, Cashback and exclusive promotions.",
    image: "/Hero-Banner.png",
    color: "from-purple-500/20 to-gold/15",
    icon: StarIcon,
    action: "link",
    href: "/vip",
    buttonText: "View VIP",
  },
  {
    id: "lucky-spin",
    badge: "Coming Soon",
    badgeColor: "bg-white/10 text-white/50",
    title: "Lucky Spin",
    subtitle: "Coming Soon",
    description:
      "Lucky Spin is currently under development and will be available soon.",
    image: "/Hero-Banner.png",
    color: "from-gold/25 to-amber-500/15",
    icon: SparklesIcon,
    action: "disabled",
    disabled: true,
    buttonText: "Coming Soon",
  },
  {
    id: "weekly-rewards",
    badge: "Coming Soon",
    badgeColor: "bg-white/10 text-white/50",
    title: "Weekly Rewards",
    subtitle: "Coming Soon",
    description:
      "Weekly Rewards will be available in a future update.",
    image: "/Hero-Banner.png",
    color: "from-rose-500/20 to-gold/10",
    icon: BanknotesIcon,
    action: "disabled",
    disabled: true,
    buttonText: "Coming Soon",
  },
];

export default function PromotionsPage() {
  const router = useRouter();

  const handleAction = (promo: Promotion) => {
    if (promo.disabled) return;

    if (promo.href && promo.href !== "#") {
      if (promo.queryParams) {
        router.push(`${promo.href}?${promo.queryParams}`);
      } else {
        router.push(promo.href);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, promo: Promotion) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleAction(promo);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <SectionHeading
        eyebrow="Promotion center"
        title="Exclusive bonuses & rewards"
        description="Welcome bonus, cashback, referral, VIP, lucky spin, and weekly rewards — all in one place."
      />

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {promotions.map((promo, index) => {
          const Icon = promo.icon;
          const isDisabled = promo.disabled;

          return (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              onClick={() => handleAction(promo)}
              onKeyDown={(e) => handleKeyDown(e, promo)}
              role={isDisabled ? "presentation" : "button"}
              tabIndex={isDisabled ? -1 : 0}
              className={`
                group relative overflow-hidden rounded-3xl border
                ${isDisabled
                  ? "border-white/5 bg-black/30 opacity-60 cursor-not-allowed"
                  : "border-white/10 bg-black/40 cursor-pointer transition duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-glow"
                }
              `}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${promo.color} ${
                  isDisabled ? "opacity-20" : "opacity-40 transition group-hover:opacity-60"
                }`}
              />

              <div className="relative z-10 flex flex-col h-full">
                {/* Image header */}
                <div className="relative h-48 w-full overflow-hidden">
                  <Image
                    alt={promo.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className={`object-cover transition duration-500 ${
                      isDisabled ? "" : "group-hover:scale-105"
                    }`}
                    src={promo.image}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute bottom-4 left-4 right-4">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${promo.badgeColor}`}
                    >
                      {promo.badge}
                    </span>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      {promo.title}
                    </h3>
                    <p className="text-sm text-gold">{promo.subtitle}</p>
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`rounded-xl border p-2 ${
                        isDisabled
                          ? "border-white/5 bg-white/5 text-white/30"
                          : "border-gold/20 bg-gold/10 text-gold"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p
                    className={`flex-1 text-sm leading-6 ${
                      isDisabled ? "text-white/35" : "text-white/65"
                    }`}
                  >
                    {promo.description}
                  </p>

                  {/* Button */}
                  {isDisabled ? (
                    <button
                      type="button"
                      disabled
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-5 py-3 text-sm font-semibold text-white/30 cursor-not-allowed"
                    >
                      {promo.buttonText}
                    </button>
                  ) : (
                    <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 cursor-pointer">
                      {promo.id === "referral" && <UsersIcon className="h-4 w-4" />}
                      {promo.buttonText}
                      <ArrowRightIcon className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}