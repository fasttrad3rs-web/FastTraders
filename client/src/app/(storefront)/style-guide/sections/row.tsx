/** One labelled row of variants. Shared by the style-guide sections. */
export function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="border-b border-border py-4 last:border-0">
      <p className="mb-2.5 font-mono text-2xs uppercase tracking-wide text-brand-cyan">{label}</p>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </div>
  );
}
