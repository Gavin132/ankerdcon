import { ChevronDown } from "lucide-react";
import { SECTION, SECTION_TITLE } from "../styles";

interface Props {
  title: string;
  /** A block that is rarely needed folds away behind its title (a native `<details>`, so it works without script). */
  collapsible?: boolean;
  /** Only for a `collapsible` block: start open. */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** One block of fields in an admin sheet: a title and the fields, a divider between blocks (see `SECTION`). */
export function AdminSection({ title, collapsible, defaultOpen = true, children }: Props) {
  if (!collapsible) {
    return (
      <div className={SECTION}>
        <p className={SECTION_TITLE}>{title}</p>
        {children}
      </div>
    );
  }
  return (
    <details className={`group ${SECTION}`} open={defaultOpen}>
      <summary className="-mt-2 flex min-h-11 cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
        <span className={SECTION_TITLE}>{title}</span>
        <ChevronDown size={16} className="text-ink-3 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3">{children}</div>
    </details>
  );
}
