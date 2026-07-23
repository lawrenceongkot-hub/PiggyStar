"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/lib/auth/store";
import { apiFetch } from "@/lib/api/client";
import { GlassCard, ProgressBar, SectionHeading } from "@/components/ui/casino-ui";
import { TrophyIcon, StarIcon, CurrencyDollarIcon, GiftIcon, CheckBadgeIcon } from "@heroicons/react/24/outline";
import { formatPHP } from "@/lib/format";

const VIP_TIERS = [
{ level: 0, name: "VIP0", requiredValidBet: 0, requiredMonthlyDeposit: 0, birthdayBonus: 0, cashbackRate: 0, monthlySalary: 0, color: "from-gray-700/40 to-gray-900/30", icon: "⬜", benefits: ["Basic account", "Standard support"] },
{ level: 1, name: "VIP1", requiredValidBet: 50000, requiredMonthlyDeposit: 2000, birthdayBonus: 100, cashbackRate: 0.002, monthlySalary: 100, color: "from-amber-700/30 to-amber-900/20", icon: "👑", benefits: ["Standard withdrawal limits", "Basic support", "Welcome bonus"] },
{ level: 2, name: "VIP2", requiredValidBet: 150000, requiredMonthlyDeposit: 5000, birthdayBonus: 200, cashbackRate: 0.0025,monthlySalary: 300, color: "from-slate-300/30 to-slate-500/20", icon: "👑", benefits: ["Increased withdrawal limits", "Priority email support", "Weekly cashback 0.25%"] },
{ level: 3, name: "VIP3", requiredValidBet: 400000, requiredMonthlyDeposit: 10000, birthdayBonus: 300, cashbackRate: 0.003, monthlySalary: 600, color: "from-gold/30 to-yellow-700/20", icon: "👑", benefits: ["Higher withdrawal limits", "Live chat priority", "Weekly cashback 0.30%", "Birthday bonus ₱300"] },
{ level: 4, name: "VIP4", requiredValidBet: 800000, requiredMonthlyDeposit: 20000, birthdayBonus: 500, cashbackRate: 0.0035,monthlySalary: 1000, color: "from-cyan-400/30 to-cyan-700/20", icon: "👑", benefits: ["VIP withdrawal limits", "Dedicated account manager", "Weekly cashback 0.35%", "Birthday bonus ₱500"] },
{ level: 5, name: "VIP5", requiredValidBet: 1500000, requiredMonthlyDeposit: 35000, birthdayBonus: 800, cashbackRate: 0.004, monthlySalary: 1500, color: "from-blue-300/30 to-blue-600/20", icon: "👑", benefits: ["Higher VIP limits", "Personal VIP host", "Weekly cashback 0.40%", "Luxury gifts"] },
{ level: 6, name: "VIP6", requiredValidBet: 3000000, requiredMonthlyDeposit: 50000, birthdayBonus: 1000, cashbackRate: 0.005, monthlySalary: 2500, color: "from-emerald-400/30 to-emerald-700/20", icon: "👑", benefits: ["Premium limits", "24/7 support", "Weekly cashback 0.50%", "Exclusive promotions"] },
{ level: 7, name: "VIP7", requiredValidBet: 5000000, requiredMonthlyDeposit: 80000, birthdayBonus: 1500, cashbackRate: 0.006, monthlySalary: 4000, color: "from-purple-400/30 to-purple-700/20", icon: "👑", benefits: ["Elite withdrawal limits", "Priority withdrawals", "Weekly cashback 0.60%"] },
{ level: 8, name: "VIP8", requiredValidBet: 8000000, requiredMonthlyDeposit: 120000, birthdayBonus: 2000, cashbackRate: 0.007, monthlySalary: 6000, color: "from-pink-400/30 to-pink-700/20", icon: "👑", benefits: ["VIP concierge", "Instant withdrawals", "Weekly cashback 0.70%"] },
{ level: 9, name: "VIP9", requiredValidBet: 12000000, requiredMonthlyDeposit: 180000, birthdayBonus: 3000, cashbackRate: 0.008, monthlySalary: 9000, color: "from-red-400/30 to-red-700/20", icon: "👑", benefits: ["Diamond service", "Custom rewards", "Weekly cashback 0.80%"] },
{ level: 10, name: "VIP10", requiredValidBet: 18000000, requiredMonthlyDeposit: 250000, birthdayBonus: 5000, cashbackRate: 0.009, monthlySalary: 13000,color: "from-orange-400/30 to-orange-700/20", icon: "👑", benefits: ["Platinum status", "Invitation to events", "Weekly cashback 0.90%"] },
{ level: 11, name: "VIP11", requiredValidBet: 30000000, requiredMonthlyDeposit: 400000, birthdayBonus: 7500, cashbackRate: 0.01, monthlySalary: 18000,color: "from-amber-300/30 to-amber-600/20", icon: "👑", benefits: ["Black card", "Personal butler", "Weekly cashback 1.00%"] },
{ level: 12, name: "VIP12", requiredValidBet: 45000000, requiredMonthlyDeposit: 600000, birthdayBonus: 10000,cashbackRate: 0.011, monthlySalary: 25000,color: "from-gold/40 to-yellow-600/30", icon: "👑", benefits: ["Royal treatment", "Luxury trips", "Weekly cashback 1.10%"] },
{ level: 13, name: "VIP13", requiredValidBet: 65000000, requiredMonthlyDeposit: 900000, birthdayBonus: 15000,cashbackRate: 0.012, monthlySalary: 35000,color: "from-red-300/30 to-red-600/20", icon: "👑", benefits: ["Imperial service", "All expenses paid", "Weekly cashback 1.20%"] },
{ level: 14, name: "VIP14", requiredValidBet: 90000000, requiredMonthlyDeposit: 1300000, birthdayBonus: 20000,cashbackRate: 0.0135,monthlySalary: 50000,color: "from-purple-300/30 to-purple-600/20", icon: "👑", benefits: ["Legendary status", "Custom experiences", "Weekly cashback 1.35%"] },
{ level: 15, name: "VIP15", requiredValidBet: 130000000,requiredMonthlyDeposit: 2000000, birthdayBonus: 30000,cashbackRate: 0.015, monthlySalary: 80000,color: "from-gold/50 to-yellow-500/30", icon: "👑", benefits: ["Ultimate VIP", "Everything included", "Weekly cashback 1.50%"] },
];

const faqItems = [
{ q: "How do I upgrade my VIP level?", a: "VIP levels are automatically calculated based on your lifetime valid betting turnover and monthly deposit. When both requirements are met, you'll be upgraded immediately." },
{ q: "How is cashback calculated?", a: "Weekly cashback is calculated as your total valid bet × your VIP cashback rate. Only settled bets with valid turnover count." },
{ q: "When can I claim cashback?", a: "Cashback can be claimed once per week. The period resets every Monday at 00:00." },
{ q: "What is the monthly salary?", a: "The monthly salary is a fixed amount credited to your wallet based on your VIP level, provided you meet the monthly deposit requirement." },
{ q: "How does the birthday bonus work?", a: "The birthday bonus can be claimed once per calendar year. The amount depends on your current VIP level." },
{ q: "Can I lose my VIP level?", a: "Your VIP level is calculated dynamically. If you don't maintain the required betting and deposit activity, your level may decrease." },
];

export default function VipProgramPage() {
const user = useCurrentUser();
const [playerVip, setPlayerVip] = useState<{ currentLevel: number; currentTierName: string } | null>(null);

useEffect(() => {
if (!user) return;
apiFetch<any>("/api/vip").then(d => {
setPlayerVip({ currentLevel: d.currentLevel, currentTierName: d.currentTierName });
}).catch(() => {});
}, [user]);

return (
<div className="space-y-12 pb-20">
{/* Hero Banner */}
<section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-gold/20 via-emerald/10 to-surface p-8 md:p-12">
<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,215,0,0.15),transparent_60%)]" />
<div className="relative z-10 text-center">
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
<TrophyIcon className="h-12 w-12 text-gold mx-auto mb-4" />
<h1 className="text-4xl md:text-5xl font-bold text-white mb-4">PIGGYSTAR VIP PROGRAM</h1>
<p className="text-lg text-white/70 max-w-2xl mx-auto">
Experience the ultimate casino journey with 16 exclusive VIP tiers.
Each level unlocks greater rewards, higher limits, and premium benefits.
</p>
{playerVip && (
<div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-6 py-3">
<TrophyIcon className="h-5 w-5 text-gold" />
<span className="text-gold font-semibold">Your Current Level: {playerVip.currentTierName}</span>
</div>
)}
</motion.div>
</div>
</section>

{/* VIP Table - All 16 Levels */}
<section>
<SectionHeading eyebrow="VIP Tiers" title="Complete VIP Comparison" description="Every level from VIP0 to VIP15 with requirements and rewards." />
<div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
{VIP_TIERS.map((tier, idx) => {
const isCurrent = playerVip?.currentLevel === tier.level;
const isNext = playerVip && playerVip.currentLevel + 1 === tier.level;
const isUnlocked = playerVip && playerVip.currentLevel >= tier.level;

return (
<motion.div
key={tier.level}
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: idx * 0.03 }}
className={`relative overflow-hidden rounded-3xl border p-5 transition-all duration-300 ${
isCurrent
? "border-gold/50 bg-gold/10 shadow-glow scale-[1.02]"
: isNext
? "border-emerald/30 bg-emerald/5"
: isUnlocked
? "border-white/10 bg-white/5"
: tier.level === 0 ? "border-white/5 bg-black/20" : "border-white/5 bg-black/30 opacity-70"
}`}
>
<div className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-30`} />
<div className="relative z-10">
<div className="flex items-center justify-between">
<span className="text-2xl">{tier.icon}</span>
{isCurrent && (
<span className="rounded-full bg-gold px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
Current
</span>
)}
{isNext && !isCurrent && (
<span className="rounded-full border border-emerald/30 bg-emerald/10 px-3 py-0.5 text-[10px] font-semibold text-emerald">
Next Target
</span>
)}
</div>
<h3 className="mt-3 text-lg font-bold text-white">{tier.name}</h3>

<div className="mt-4 space-y-1.5 text-xs">
<RequirementRow label="Valid Bet" value={tier.requiredValidBet} />
<RequirementRow label="Monthly Deposit" value={tier.requiredMonthlyDeposit} />
<div className="border-t border-white/[0.06] my-2" />
<RewardRow label="Birthday Bonus" value={tier.birthdayBonus} />
<RewardRow label="Cashback" value={`${(tier.cashbackRate * 100).toFixed(2)}%`} />
<RewardRow label="Monthly Salary" value={tier.monthlySalary} />
</div>

{tier.level > 0 && (
<ul className="mt-3 space-y-1">
{tier.benefits.map((b, i) => (
<li key={i} className="flex items-start gap-1.5 text-[11px] text-white/60">
<CheckBadgeIcon className="h-3 w-3 text-gold mt-0.5 shrink-0" />
{b}
</li>
))}
</ul>
)}
</div>
</motion.div>
);
})}
</div>
</section>

{/* Benefits Overview */}
<GlassCard>
<SectionHeading eyebrow="VIP Benefits" title="Reward Timeline" description="Recurring rewards based on your VIP level." />
<div className="grid gap-4 sm:grid-cols-3">
<div className="rounded-xl border border-white/[0.06] bg-white/5 p-5 text-center">
<GiftIcon className="h-8 w-8 text-gold mx-auto mb-2" />
<h4 className="font-semibold text-white">Weekly Cashback</h4>
<p className="text-xs text-white/50 mt-1">Up to 1.50% cashback on valid bets. Claim once per week.</p>
</div>
<div className="rounded-xl border border-white/[0.06] bg-white/5 p-5 text-center">
<CurrencyDollarIcon className="h-8 w-8 text-gold mx-auto mb-2" />
<h4 className="font-semibold text-white">Monthly Salary</h4>
<p className="text-xs text-white/50 mt-1">Fixed salary credited monthly. Requires minimum deposit.</p>
</div>
<div className="rounded-xl border border-white/[0.06] bg-white/5 p-5 text-center">
<StarIcon className="h-8 w-8 text-gold mx-auto mb-2" />
<h4 className="font-semibold text-white">Birthday Bonus</h4>
<p className="text-xs text-white/50 mt-1">Special bonus on your birthday. Once per calendar year.</p>
</div>
</div>
</GlassCard>

{/* FAQ */}
<GlassCard>
<SectionHeading eyebrow="FAQ" title="Frequently Asked Questions" description="Common questions about the VIP program." />
<div className="space-y-3">
{faqItems.map((item, i) => (
<details key={i} className="group rounded-xl border border-white/[0.06] bg-white/5">
<summary className="cursor-pointer px-4 py-3 text-sm font-medium text-white group-open:text-gold transition">
{item.q}
</summary>
<div className="px-4 pb-3 text-sm text-white/60">
{item.a}
</div>
</details>
))}
</div>
</GlassCard>

{/* Terms */}
<GlassCard className="text-center">
<p className="text-xs text-white/40">
VIP program terms and conditions apply. Rewards are subject to change at management's discretion.
All amounts are in Philippine Pesos (₱). Valid bets exclude cancelled, voided, and refunded bets.
Deposit requirements are based on confirmed successful deposits within the current calendar month.
</p>
</GlassCard>
</div>
);
}

function RequirementRow({ label, value }: { label: string; value: number }) {
return (
<div className="flex items-center justify-between">
<span className="text-white/50">{label}</span>
<span className="text-white font-medium">{value > 0 ? `₱${value.toLocaleString()}` : "—"}</span>
</div>
);
}

function RewardRow({ label, value }: { label: string; value: string | number }) {
const display = typeof value === "number" ? (value > 0 ? `₱${value.toLocaleString()}` : "—") : value;
return (
<div className="flex items-center justify-between">
<span className="text-white/50">{label}</span>
<span className="text-gold font-medium">{display}</span>
</div>
);
}