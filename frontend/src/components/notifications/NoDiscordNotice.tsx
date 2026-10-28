import { Link } from "react-router-dom";
import { ArrowRight, MessageSquareOff } from "lucide-react";
import { routes } from "../../config/routes";

interface Props {
  /** Show the "Discord koppelen" link (not during onboarding, where Instellingen is not reachable yet). */
  withLink?: boolean;
  /** Extra sentence at the end. */
  extra?: string;
}

/** Said to a member signed in without Discord: the bot has nobody to send to, and where to fix that. One text for
 * the notification settings and the onboarding step, so the two cannot drift apart. */
export function NoDiscordNotice({ withLink, extra }: Props) {
  return (
    <div className="notice-warn flex items-start gap-3 p-4">
      <div className="icon-tile-warn h-8 w-8">
        <MessageSquareOff size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">Je ontvangt nog geen Discord-berichten</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-2">
          Je bent ingelogd met Google, dus de bot heeft geen Discord-account om naartoe te sturen. Je kunt dit alsnog
          koppelen via Instellingen.{extra ? ` ${extra}` : ""}
        </p>
        {withLink && (
          <Link
            to={routes.settings}
            className="hit-area mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-warn hover:underline"
          >
            Discord koppelen
            <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </div>
  );
}
