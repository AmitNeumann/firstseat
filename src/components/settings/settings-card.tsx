export function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-border bg-card p-[clamp(20px,4vw,28px)] shadow-card">
      <header className="mb-5 flex flex-col gap-1">
        <h2 className="font-serif text-[22px] font-normal text-espresso">{title}</h2>
        {description && <p className="text-sm leading-normal text-muted">{description}</p>}
      </header>
      {children}
    </section>
  );
}
