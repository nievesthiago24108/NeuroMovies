import { searchMulti } from "@/lib/tmdb/api";
import { hasTmdbToken, TmdbHttpError } from "@/lib/tmdb/client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? 12);
  const take = Number.isFinite(limit) && limit > 0 && limit <= 20 ? limit : 12;

  if (!q.trim()) {
    return Response.json({ results: [] });
  }
  if (!hasTmdbToken()) {
    return Response.json(
      { error: "missing-token" },
      { status: 400 },
    );
  }

  try {
    const results = await searchMulti(q);
    return Response.json({ results: results.slice(0, take) });
  } catch (error) {
    if (error instanceof TmdbHttpError) {
      return Response.json(
        { error: error.message, status: error.status },
        { status: error.status },
      );
    }
    return Response.json(
      { error: "tmdb-request-failed" },
      { status: 502 },
    );
  }
}