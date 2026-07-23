import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getTransactionHistory } from "@/lib/server/transaction-history";

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1", 10);
const limit = parseInt(searchParams.get("limit") || "20", 10);
const type = searchParams.get("type");
const status = searchParams.get("status");
const startDate = searchParams.get("startDate");
const endDate = searchParams.get("endDate");
const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

try {
const result = await getTransactionHistory(user.id, {
page,
limit,
type,
status,
startDate: startDate ?? undefined,
endDate: endDate ?? undefined,
sortOrder,
isAdmin: false,
});

return NextResponse.json({
transactions: result.transactions,
pagination: result.pagination,
});
} catch (error) {
console.error("Error fetching transactions:", error);
const message = error instanceof Error ? error.message : String(error);
console.error("Error details:", message);
return NextResponse.json({ error: "Failed to fetch transactions", details: message }, { status: 500 });
}
}
