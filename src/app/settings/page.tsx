import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";

const settings = [
"Language",
"Currency",
"Dark Mode",
"Notifications",
"Security",
"Session Management",
];

export default function SettingsPage() {
return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Settings"
title="Language, currency, dark mode, notifications, and security"
description="A compact settings overview built for mobile and desktop."
/>
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
{settings.map((setting, index) => (
<GlassCard key={setting} className="flex items-center justify-between">
<div>
<p className="font-medium text-white">{setting}</p>
<p className="text-sm text-white/55">Preference item</p>
</div>
<div className="h-6 w-11 rounded-full bg-white/10 p-1">
<div className={`h-4 w-4 rounded-full ${index < 2 ? "ml-auto bg-gold" : "bg-white/45"}`} />
</div>
</GlassCard>
))}
</div>
</div>
);
}
