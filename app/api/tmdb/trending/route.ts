import { getTrending } from "@/lib/tmdb/api";
import { hasTmdbToken, TmdbHttpError } from "@/lib/tmdb/client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = url.searchParams.get("period") === "day" ? "day" : "week";
  const limit = Number(url.searchParams.get("limit") ?? 12);
  const take = Number.isFinite(limit) && limit > 0 && limit <= 24 ? limit : 12;

  if (!hasTmdbToken()) {
    return Response.json({ error: "missing-token" }, { status: 400 });
  }
  try {
    const results = await getTrending(period);
    return Response.json({ results: results.slice(0, take) });
  } catch (error) {
    if (error instanceof TmdbHttpError) {
      return Response.json({ error: error.message, status: error.status }, { status: error.status });
    }
    return Response.json({ error: "tmdb-request-failed" }, { status: 502 });
  }
}