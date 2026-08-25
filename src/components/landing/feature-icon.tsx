/**
 * Small marks above the three landing feature cards.
 *
 * Decorative only — each card already has a heading — so they are hidden from
 * assistive tech. Colours follow the card they sit on: clay on white, honey-muted
 * on honey-light, clay-text on honey.
 */
export function FeatureIcon({
  name,
  className,
}: {
  name: "table" | "math" | "reveal";
  className: string;
}) {
  const paths = {
    table:
      "M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
    math: "M12 6v6l4 2M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z",
    reveal:
      "M6 10a6 6 0 0 1 12 0c0 7 3 8.5 3 8.5H3S6 17 6 10zm6 11.5a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z",
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
