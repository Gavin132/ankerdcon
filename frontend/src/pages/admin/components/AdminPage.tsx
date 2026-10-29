interface Props {
  /** `wide` for lists and tables, `narrow` for a form or a test tool. */
  width?: "wide" | "narrow";
  children: React.ReactNode;
}

/** The frame of every admin page: the same width, padding and rhythm (`space-y-5`) on all of them. */
export function AdminPage({ width = "wide", children }: Props) {
  return (
    <div
      className={`mx-auto space-y-5 px-4 py-5 sm:px-6 sm:py-8 lg:px-10 ${width === "narrow" ? "max-w-3xl" : "max-w-6xl"}`}
    >
      {children}
    </div>
  );
}
