import { getPopular } from "@/lib/tmdb/api";
import { hasTmdbToken, TmdbHttpError } from "@/lib/tmdb/client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const mediaType = type === "movie" || type === "tv" ? type : null;
  const limit = Number(url.searchParams.get("limit") ?? 12);
  const take = Number.isFinite(limit) && limit > 0 && limit <= 24 ? limit : 12;

  if (!hasTmdbToken()) {
    return Response.json({ error: "missing-token" }, { status: 400 });
  }
  try {
    if (mediaType === "movie") {
      const results = await getPopular("movie");
      return Response.json({ results: results.slice(0, take) });
    }
    if (mediaType === "tv") {
      const results = await getPopular("tv");
      return Response.json({ results: results.slice(0, take) });
    }
    // default to mixed trending shape via trending all/week trimmed
    const results = await getPopular("movie");
    const tvs = await getPopular("tv");
    const merged = [...results, ...tvs].sort((a, b) => (b.tmdbId % 7) - (a.tmdbId % 7));
    return Response.json({ results: merged.slice(0, take) });
  } catch (error) {
    if (error instanceof TmdbHttpError) {
      return Response.json({ error: error.message, status: error.status }, { status: error.status });
    }
    return Response.json({ error: "tmdb-request-failed" }, { status: 502 });
  }
}