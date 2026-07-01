import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Sparkles, Calendar, ImageOff, ExternalLink } from "lucide-react";
import { useCosplays } from "../hooks/useCosplays";
import { useCalendar } from "../hooks/useCalendar";
import { useUsers } from "../hooks/useUsers";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { UserAvatar } from "../components/common/UserAvatar";
import { formatDate } from "../utils/format";
import { routes } from "../config/routes";

export function CosplayDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data: cosplays = [], isLoading } = useCosplays();
  const { data: events   = [] }            = useCalendar();
  const { data: users    = [] }            = useUsers();

  const cosplay = cosplays.find((c) => c.id === id);
  const user    = cosplay
    ? users.find((u) => u.name === cosplay.user_name || u.discord_username === cosplay.user_name)
    : undefined;

  const linkedEvents = cosplay
    ? cosplay.linked_event_ids
        .map((eid) => events.find((e) => e.id === eid))
        .filter((e): e is NonNullable<typeof e> => e !== undefined)
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DetailTopbar title="Laden…" onBack={() => navigate(-1)} />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!cosplay) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-slate-400">
        <Sparkles size={40} className="opacity-30" />
        <p className="text-sm">Cosplay niet gevonden</p>
        <button onClick={() => navigate(-1)} className="text-xs text-sky-500 underline">Terug</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DetailTopbar
        title={cosplay.character_name}
        onBack={() => navigate(-1)}
      />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-500" />

        {/* Background: first image blurred */}
        {cosplay.inspo_images[0] && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10 dark:opacity-5 blur-2xl scale-110"
            style={{ backgroundImage: `url(${cosplay.inspo_images[0]})` }}
          />
        )}

        <div className="relative px-4 pt-8 pb-7 max-w-2xl mx-auto">
          {/* Character info */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 shadow-lg">
              <Sparkles size={26} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {cosplay.character_name}
              </h1>
              {cosplay.series && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {cosplay.series}
                </p>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {/* User chip */}
            <div className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5">
              <UserAvatar
                name={user?.name ?? cosplay.user_name}
                user={user}
                className="h-5 w-5 text-[8px]"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {user?.name ?? cosplay.user_name}
              </span>
            </div>

            {/* Day chips */}
            {linkedEvents.map((e) => (
              <Link
                key={e.id}
                to={routes.event.view(e.id)}
                className="flex items-center gap-1.5 rounded-full border border-violet-200 dark:border-violet-700/50 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
              >
                <Calendar size={11} />
                {formatDate(e.date)}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ── Inspo images ── */}
        {cosplay.inspo_images.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">
              Inspiratie
            </p>
            <div className={`grid gap-2 ${
              cosplay.inspo_images.length === 1
                ? "grid-cols-1"
                : cosplay.inspo_images.length === 2
                ? "grid-cols-2"
                : "grid-cols-2 sm:grid-cols-3"
            }`}>
              {cosplay.inspo_images.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightbox(url)}
                  className="relative aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 hover:opacity-90 active:scale-95 transition-all group"
                >
                  <img
                    src={url}
                    alt={`Inspiratie ${i + 1}`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-600">
                    <ImageOff size={20} />
                    <span className="text-[10px]">Afbeelding niet beschikbaar</span>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/50 text-white hover:bg-black/70"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Notes ── */}
        {cosplay.notes && (
          <div className="card-surface rounded-2xl px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Notities
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {cosplay.notes}
            </p>
          </div>
        )}

      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Inspiratie"
            className="max-h-full max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
