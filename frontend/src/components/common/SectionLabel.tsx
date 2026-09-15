interface SectionLabelProps {
  children: React.ReactNode;
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-2 px-1 mb-3">
      <span className="section-label">{children}</span>
      <div className="flex-1 h-px bg-line" />
    </div>
  );
}
