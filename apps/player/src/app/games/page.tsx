import GameLobbyExplorer from "@/components/pages/game-lobby";
import { SectionHeading } from "@/components/ui/casino-ui";

export default function GamesPage() {
return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Game lobby"
title="Search, filters, providers, and infinite scroll"
description="This page includes search, provider chips, badges, hover animation, favorites, and lazy append behavior."
/>
<GameLobbyExplorer />
</div>
);
}
