import { NextResponse } from "next/server";
import { getAvailableGames, getGameCategories, getGameProviders } from "@/lib/server/game-service";

export async function GET(request: Request) {
try {
const url = new URL(request.url);
const category = url.searchParams.get("category") || undefined;
const provider = url.searchParams.get("provider") || undefined;
const search = url.searchParams.get("search") || undefined;
const page = parseInt(url.searchParams.get("page") || "1");
const pageSize = parseInt(url.searchParams.get("pageSize") || "50");

const [games, categories, providers] = await Promise.all([
getAvailableGames({ category, provider, search, page, pageSize }),
getGameCategories(),
getGameProviders(),
]);

return NextResponse.json({
games: games.games,
categories,
providers,
pagination: games.pagination,
});
} catch (error) {
console.error("Games API error:", error);
return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
}