import { describe, expect, it } from "vitest";
import {
  fillMissing,
  movieToTitle,
  seasonToEpisodes,
  toSearchEntry,
  tvToSeasons,
  tvToTitle,
} from "@/lib/tmdb/transform";
import type {
  TmdbMovieDetail,
  TmdbSearchResult,
  TmdbTvDetail,
} from "@/lib/tmdb/types";

describe("toSearchEntry", () => {
  it("maps a movie search result", () => {
    const result: TmdbSearchResult = {
      id: 550,
      media_type: "movie",
      title: "Fight Club",
      overview: "Un narrador…",
      poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      release_date: "1999-10-15",
    };
    expect(toSearchEntry(result)).toEqual({
      tmdbId: 550,
      mediaType: "movie",
      title: "Fight Club",
      releaseDate: "1999-10-15",
      posterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      overview: "Un narrador…",
    });
  });

  it("maps a TV search result using the name and first_air_date", () => {
    const result: TmdbSearchResult = {
      id: 1399,
      media_type: "tv",
      name: "Game of Thrones",
      first_air_date: "2011-04-17",
      poster_path: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    };
    expect(toSearchEntry(result)).toMatchObject({
      tmdbId: 1399,
      mediaType: "tv",
      title: "Game of Thrones",
      releaseDate: "2011-04-17",
    });
  });

  it("returns null for person results", () => {
    const result: TmdbSearchResult = { id: 1, media_type: "person", name: "Al Pacino" };
    expect(toSearchEntry(result)).toBeNull();
  });

  it("returns null when the title is empty", () => {
    const result: TmdbSearchResult = { id: 2, media_type: "movie" };
    expect(toSearchEntry(result)).toBeNull();
  });

  it("coalesces empty strings to null for optional fields", () => {
    const result: TmdbSearchResult = {
      id: 3,
      media_type: "movie",
      title: "X",
      overview: "",
      poster_path: null,
      release_date: "",
    };
    expect(toSearchEntry(result)).toMatchObject({
      releaseDate: null,
      posterPath: null,
      overview: "",
    });
  });
});

describe("movieToTitle", () => {
  it("maps a movie detail to a TitleDraft", () => {
    const detail: TmdbMovieDetail = {
      id: 550,
      title: "El club de la pelea",
      original_title: "Fight Club",
      overview: "Un hombre…",
      poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      backdrop_path: "/87hTDiPx2Cw6QdZQaBzQ9f8mQ7O.jpg",
      release_date: "1999-10-15",
      genres: [{ id: 18, name: "Drama" }],
      runtime: 139,
      status: "Released",
    };
    const draft = movieToTitle(detail);
    expect(draft).toMatchObject({
      tmdbId: 550,
      mediaType: "movie",
      title: "El club de la pelea",
      originalTitle: "Fight Club",
      releaseDate: "1999-10-15",
      runtime: 139,
      tmdbStatus: "Released",
      numberOfSeasons: null,
      firstAirDate: null,
    });
    expect(draft.genres).toEqual([{ id: 18, name: "Drama" }]);
  });

  it("maps empty genres to null", () => {
    const detail: TmdbMovieDetail = {
      id: 1,
      title: "X",
      original_title: "X",
      overview: "",
      genres: [],
      runtime: null,
      poster_path: "",
      backdrop_path: null,
      release_date: "",
      status: "",
    };
    const draft = movieToTitle(detail);
    expect(draft.genres).toBeNull();
    expect(draft.overview).toBeNull();
    expect(draft.runtime).toBeNull();
    expect(draft.releaseDate).toBeNull();
  });
});

describe("tvToTitle and tvToSeasons", () => {
  const detail: TmdbTvDetail = {
    id: 1399,
    name: "Game of Thrones",
    original_name: "Game of Thrones",
    overview: "Los señores de los Siete Reinos…",
    poster_path: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    backdrop_path: null,
    first_air_date: "2011-04-17",
    genres: [{ id: 10765, name: "Sci-Fi & Fantasy" }],
    episode_run_time: [60, 55],
    status: "Ended",
    number_of_seasons: 8,
    seasons: [
      { id: 100, name: "Especiales", overview: "", season_number: 0, episode_count: 15, air_date: null, poster_path: null },
      { id: 111, name: "Temporada 1", overview: "", season_number: 1, episode_count: 10, air_date: "2011-04-17", poster_path: null },
    ],
  };

  it("maps a TV detail to a TitleDraft", () => {
    const draft = tvToTitle(detail);
    expect(draft).toMatchObject({
      tmdbId: 1399,
      mediaType: "tv",
      title: "Game of Thrones",
      firstAirDate: "2011-04-17",
      runtime: 60,
      tmdbStatus: "Ended",
      numberOfSeasons: 8,
      releaseDate: null,
    });
  });

  it("maps seasons and keeps the specials season (0) with its own number", () => {
    const seasons = tvToSeasons(detail);
    expect(seasons).toHaveLength(2);
    expect(seasons[0]).toMatchObject({ seasonNumber: 0, episodeCount: 15 });
    expect(seasons[1]).toMatchObject({
      seasonNumber: 1,
      episodeCount: 10,
      airDate: "2011-04-17",
    });
  });

  it("returns an empty array when the detail has no seasons", () => {
    expect(tvToSeasons({ ...detail, seasons: [] })).toEqual([]);
  });
});

describe("seasonToEpisodes", () => {
  it("maps an episode list preserving season and episode numbers", () => {
    const episodes = seasonToEpisodes({
      season_number: 1,
      episodes: [
        {
          id: 1001,
          name: "El invierno se acerca",
          overview: "…",
          episode_number: 1,
          air_date: "2011-04-17",
          runtime: 62,
          still_path: "/still.jpg",
        },
        { id: 1002, name: "El rey caído", overview: "", episode_number: 2, air_date: null, runtime: null, still_path: null },
      ],
    });
    expect(episodes).toHaveLength(2);
    expect(episodes[0]).toEqual({
      tmdbId: 1001,
      seasonNumber: 1,
      episodeNumber: 1,
      name: "El invierno se acerca",
      overview: "…",
      airDate: "2011-04-17",
      runtime: 62,
      stillPath: "/still.jpg",
    });
    expect(episodes[1]).toMatchObject({
      tmdbId: 1002,
      episodeNumber: 2,
      name: "El rey caído",
      overview: null,
      airDate: null,
      runtime: null,
      stillPath: null,
    });
  });
});

describe("fillMissing", () => {
  it("fills empty primary fields from the fallback payload", () => {
    type Payload = { title: string; overview: string | undefined; runtime: number };
    const primary: Payload = { title: "", overview: undefined, runtime: 120 };
    const fallback: Payload = { title: "Fight Club", overview: "A man…", runtime: 999 };
    const merged = fillMissing(primary, fallback, ["title", "overview", "runtime"] as const);
    expect(merged).toEqual({ title: "Fight Club", overview: "A man…", runtime: 120 });
  });

  it("keeps populated primary fields untouched", () => {
    const primary = { title: "Real title", overview: "Real overview" };
    const fallback = { title: "Fallback", overview: "Fallback" };
    expect(fillMissing(primary, fallback, ["title", "overview"] as const)).toEqual(primary);
  });

  it("only fills the fields explicitly listed", () => {
    const primary = { title: "", overview: "Sinopsis en español" };
    const fallback = { title: "Fallback title", overview: "Fallback overview" };
    expect(fillMissing(primary, fallback, ["title"] as const)).toEqual({
      title: "Fallback title",
      overview: "Sinopsis en español",
    });
  });
});