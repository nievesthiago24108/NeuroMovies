"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { stillUrl, backdropUrl, posterUrl } from "@/lib/tmdb/images";
import type { Episode, LibraryEntry, LibraryStatus, Season, Title } from "@/db/schema";
import { StarRating } from "@/components/ui/star-rating";
import { useToast } from "@/components/ui/toast-provider";
import {
  markUpToEpisodeWatched,
  setEpisodeProgress,
  setSeasonWatched,
  updateLibraryStatus,
} from "@/app/actions";
import { averageSeriesRating, calculateProgress, isAired, isReturningSeries } from "@/lib/progress";
import { formatDate, formatRuntime } from "@/lib/utils";

const STATUS_LABEL: Record<LibraryStatus, string> = {
  wishlist: "Quiero ver",
  watching: "Viendo",
  watched: "Vista",
  abandoned: "Abandonada",
};

type EpisodeProgressState = Record<number, { watched: boolean; rating: number | null }>;

interface EpisodePatch {
  watched?: boolean;
  rating?: number | null;
}

export function SerieDetail({
  title,
  entry,
  seasons,
  episodes,
  progress,
}: {
  title: Title;
  entry: LibraryEntry | null;
  seasons: Season[];
  episodes: Episode[];
  progress: EpisodeProgressState;
}) {
  const { showToast } = useToast();
  const poster = posterUrl(title.posterPath, "w780");
  const backdrop = backdropUrl(title.backdropPath, "w780");
  const year = title.firstAirDate?.slice(0, 4) ?? "";

  const [state, setState] = useState<EpisodeProgressState>(progress);
  const [pendingStatus, setPendingStatus] = useState(false);
  const [pendingEpisode, setPendingEpisode] = useState<number | null>(null);
  const [pendingSeason, setPendingSeason] = useState<number | null>(null);

  const episodesBySeason = useMemo(() => {
    const map = new Map<number, Episode[]>();
    for (const episode of episodes) {
      const list = map.get(episode.seasonNumber);
      if (list) list.push(episode);
      else map.set(episode.seasonNumber, [episode]);
    }
    return map;
  }, [episodes]);

  const orderedSeasons = useMemo(
    () =>
      [...seasons].sort((a, b) => {
        if (a.seasonNumber === 0) return 1;
        if (b.seasonNumber === 0) return -1;
        return a.seasonNumber - b.seasonNumber;
      }),
    [seasons],
  );
  const hasSpecials = orderedSeasons.some((season) => season.seasonNumber === 0);

  const [showSpecials, setShowSpecials] = useState(false);
  const [activeSeason, setActiveSeason] = useState<number>(() => {
    const regular = orderedSeasons.find(
      (season) => season.seasonNumber !== 0 && (episodesBySeason.get(season.seasonNumber)?.length ?? 0) > 0,
    );
    return regular?.seasonNumber ?? orderedSeasons[0]?.seasonNumber ?? 0;
  });

  const visibleSeasons = orderedSeasons.filter(
    (season) => season.seasonNumber !== 0 || showSpecials,
  );
  const currentEpisodes = episodesBySeason.get(activeSeason) ?? [];
  const currentSeason = orderedSeasons.find((season) => season.seasonNumber === activeSeason);

  const nonSpecial = episodes.filter((episode) => episode.seasonNumber !== 0);
  const airedNonSpecial = nonSpecial.filter((episode) => isAired(episode.airDate));
  const watchedAired = airedNonSpecial.filter((episode) => state[episode.id]?.watched).length;
  const overall = calculateProgress({
    totalEpisodes: nonSpecial.length,
    watchedCount: watchedAired,
    airedCount: airedNonSpecial.length,
  });
  const upToDate = overall.isComplete && isReturningSeries(title.tmdbStatus);
  const seriesAverage = averageSeriesRating(
    episodes.map((episode) => state[episode.id]?.rating ?? null),
  );
  const seasonAverage = averageSeriesRating(
    currentEpisodes.map((episode) => state[episode.id]?.rating ?? null),
  );

  const applyLocal = (episodeId: number, patch: EpisodePatch): void => {
    setState((prev) => {
      const current = prev[episodeId] ?? { watched: false, rating: null };
      let watched = current.watched;
      let rating = current.rating;
      if (patch.rating !== undefined) {
        rating = patch.rating;
        if (rating !== null) watched = true;
      }
      if (patch.watched !== undefined) watched = patch.watched;
      if (!watched) rating = null;
      return { ...prev, [episodeId]: { watched, rating } };
    });
  };

  const restore = (snapshot: EpisodeProgressState): void => setState(snapshot);

  const handleRate = async (episode: Episode, next: number | null): Promise<void> => {
    const snapshot = state;
    applyLocal(episode.id, { rating: next });
    setPendingEpisode(episode.id);
    const result = await setEpisodeProgress(episode.id, { rating: next });
    setPendingEpisode(null);
    if (!result.ok) {
      restore(snapshot);
      showToast(result.error ?? "No se pudo guardar la puntuación");
    }
  };

  const handleToggleWatched = async (episode: Episode): Promise<void> => {
    const snapshot = state;
    const next = !(state[episode.id]?.watched ?? false);
    applyLocal(episode.id, { watched: next });
    setPendingEpisode(episode.id);
    const result = await setEpisodeProgress(episode.id, { watched: next });
    setPendingEpisode(null);
    if (!result.ok) {
      restore(snapshot);
      showToast(result.error ?? "No se pudo actualizar el episodio");
    }
  };

  const handleUpTo = async (episode: Episode): Promise<void> => {
    const snapshot = state;
    const list = episodesBySeason.get(episode.seasonNumber) ?? [];
    const targets = list.filter(
      (candidate) => isAired(candidate.airDate) && candidate.episodeNumber <= episode.episodeNumber,
    );
    setState((prev) => {
      const copy = { ...prev };
      for (const target of targets) {
        const current = copy[target.id] ?? { watched: false, rating: null };
        copy[target.id] = { watched: true, rating: current.rating };
      }
      return copy;
    });
    setPendingEpisode(episode.id);
    const result = await markUpToEpisodeWatched(episode.id);
    setPendingEpisode(null);
    if (!result.ok) {
      restore(snapshot);
      showToast(result.error ?? "No se pudo actualizar la temporada");
    }
  };

  const seasonFullyWatched = (seasonNumber: number): boolean => {
    const list = episodesBySeason.get(seasonNumber) ?? [];
    const aired = list.filter((episode) => isAired(episode.airDate));
    return aired.length > 0 && aired.every((episode) => state[episode.id]?.watched);
  };

  const handleSeasonToggle = async (seasonNumber: number): Promise<void> => {
    const snapshot = state;
    const markWatched = !seasonFullyWatched(seasonNumber);
    const list = episodesBySeason.get(seasonNumber) ?? [];
    const aired = list.filter((episode) => isAired(episode.airDate));
    setState((prev) => {
      const copy = { ...prev };
      for (const episode of aired) {
        const current = copy[episode.id] ?? { watched: false, rating: null };
        copy[episode.id] = markWatched
          ? { watched: true, rating: current.rating }
          : { watched: false, rating: null };
      }
      return copy;
    });
    setPendingSeason(seasonNumber);
    const result = await setSeasonWatched(title.id, seasonNumber, markWatched);
    setPendingSeason(null);
    if (!result.ok) {
      restore(snapshot);
      showToast(result.error ?? "No se pudo actualizar la temporada");
    }
  };

  const handleStatusChange = async (
    event: React.ChangeEvent<HTMLSelectElement>,
  ): Promise<void> => {
    const status = event.target.value as LibraryStatus;
    setPendingStatus(true);
    const result = await updateLibraryStatus(title.id, status);
    setPendingStatus(false);
    if (!result.ok) showToast(result.error ?? "No se pudo cambiar el estado");
  };

  return (
    <div className="flex flex-col gap-8">
      {backdrop ? (
        <div className="relative -mx-4 h-48 overflow-hidden rounded-b-xl sm:-mx-6 sm:h-64 md:h-72">
          <Image src={backdrop} alt="" fill className="object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />
        </div>
      ) : null}

      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <div className="relative mx-auto h-64 w-44 shrink-0 overflow-hidden rounded-lg shadow md:mx-0 md:h-80 md:w-56">
          {poster ? (
            <Image src={poster} alt={title.title} fill className="object-cover" priority />
          ) : (
            <div className="flex h-full items-center justify-center bg-zinc-200 text-sm text-zinc-500">
              Sin póster
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <header className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {title.title}
                {year ? ` (${year})` : ""}
              </h1>
              {upToDate ? (
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                  Al día
                </span>
              ) : null}
            </div>
            {title.originalTitle && title.originalTitle !== title.title ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{title.originalTitle}</p>
            ) : null}
          </header>

          {title.overview ? (
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {title.overview}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-zinc-400">Estado</span>
              <select
                value={entry?.status ?? "wishlist"}
                onChange={handleStatusChange}
                disabled={pendingStatus}
                className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {Object.entries(STATUS_LABEL).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-zinc-400">Promedio</span>
              <span className="flex h-9 items-center gap-1 text-sm">
                {seriesAverage != null ? (
                  <>
                    <span className="font-semibold">{seriesAverage.toFixed(1)}</span>
                    <span className="text-zinc-400">/ 5</span>
                  </>
                ) : (
                  <span className="text-zinc-400">Sin puntuaciones</span>
                )}
              </span>
            </div>
          </div>

          <div className="flex max-w-2xl flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                {overall.watchedAired} de {overall.airedCount} episodios vistos
              </span>
              <span>{overall.percentage}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={overall.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
            >
              <div
                className="h-full rounded-full bg-teal-500 transition-all"
                style={{ width: `${overall.percentage}%` }}
              />
            </div>
            <span className="text-xs text-zinc-400">
              {Math.max(0, overall.totalEpisodes - overall.airedCount)} episodios por emitir
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {visibleSeasons.map((season) => {
            const list = episodesBySeason.get(season.seasonNumber) ?? [];
            const aired = list.filter((episode) => isAired(episode.airDate));
            const watched = aired.filter((episode) => state[episode.id]?.watched).length;
            const isActive = season.seasonNumber === activeSeason;
            return (
              <button
                key={season.seasonNumber}
                type="button"
                onClick={() => setActiveSeason(season.seasonNumber)}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-teal-600 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {season.seasonNumber === 0 ? "Especiales" : `T${season.seasonNumber}`}
                <span className="text-[11px] opacity-80">
                  {watched}/{aired.length}
                </span>
              </button>
            );
          })}
          {hasSpecials ? (
            <button
              type="button"
              onClick={() => setShowSpecials((value) => !value)}
              className="rounded-full px-3 py-1 text-xs font-medium text-zinc-500 underline-offset-2 hover:underline"
            >
              {showSpecials ? "Ocultar especiales" : "Mostrar especiales"}
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {currentSeason?.name ??
                (activeSeason === 0 ? "Especiales" : `Temporada ${activeSeason}`)}
            </h2>
            <p className="text-xs text-zinc-500">
              {seasonAverage != null
                ? `Promedio de la temporada: ${seasonAverage.toFixed(1)} / 5`
                : "Sin puntuaciones en esta temporada"}
            </p>
          </div>
          {activeSeason !== 0 && currentEpisodes.length > 0 ? (
            <button
              type="button"
              onClick={() => handleSeasonToggle(activeSeason)}
              disabled={pendingSeason === activeSeason}
              className="h-9 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-70 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {seasonFullyWatched(activeSeason)
                ? "Desmarcar temporada"
                : "Marcar temporada como vista"}
            </button>
          ) : null}
        </div>

        {currentEpisodes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No hay episodios cargados para esta temporada.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {currentEpisodes.map((episode) => {
              const current = state[episode.id];
              const aired = isAired(episode.airDate);
              const still = stillUrl(episode.stillPath, "w342");
              const busy = pendingEpisode === episode.id;
              return (
                <li
                  key={episode.id}
                  className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 sm:flex-row"
                >
                  {still ? (
                    <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800 sm:h-24 sm:w-40">
                      <Image src={still} alt="" fill sizes="160px" className="object-cover" />
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {episode.episodeNumber}.{" "}
                        {episode.name ?? `Episodio ${episode.episodeNumber}`}
                      </span>
                      {!aired ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          Próximamente
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                      {episode.airDate ? <span>{formatDate(episode.airDate)}</span> : null}
                      {episode.runtime ? <span>{formatRuntime(episode.runtime)}</span> : null}
                    </div>
                    {episode.overview ? (
                      <p className="line-clamp-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {episode.overview}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-3">
                      <StarRating
                        value={current?.rating ?? null}
                        onChange={(next) => handleRate(episode, next)}
                        disabled={!aired || busy}
                        size="sm"
                        label={`Puntuación del episodio ${episode.episodeNumber}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleToggleWatched(episode)}
                        disabled={!aired || busy}
                        className={`h-8 rounded-md px-3 text-xs font-medium transition-colors disabled:opacity-60 ${
                          current?.watched
                            ? "bg-teal-600 text-white hover:bg-teal-700"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {current?.watched ? "Visto" : "Marcar visto"}
                      </button>
                      {aired ? (
                        <button
                          type="button"
                          onClick={() => handleUpTo(episode)}
                          disabled={busy}
                          className="text-xs font-medium text-zinc-500 underline-offset-2 hover:underline disabled:opacity-60"
                          title="Marcar como vistos todos los episodios emitidos hasta este"
                        >
                          Hasta aquí
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
