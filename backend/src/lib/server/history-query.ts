export interface HistoryQueryOptions {
page: number;
limit: number;
search: string;
status: string;
startDate: string;
endDate: string;
sortOrder: "asc" | "desc";
}

export function buildHistoryQueryOptions(searchParams: URLSearchParams): HistoryQueryOptions {
const page = Number.parseInt(searchParams.get("page") || "1", 10);
const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
const search = (searchParams.get("search") || "").trim();
const status = (searchParams.get("status") || "ALL").trim().toUpperCase();
const startDate = (searchParams.get("startDate") || "").trim();
const endDate = (searchParams.get("endDate") || "").trim();
const sortOrder = (searchParams.get("sortOrder") || "desc").trim().toLowerCase() === "asc" ? "asc" : "desc";

return {
page: Number.isFinite(page) && page > 0 ? page : 1,
limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 10,
search,
status: status || "ALL",
startDate,
endDate,
sortOrder,
};
}
