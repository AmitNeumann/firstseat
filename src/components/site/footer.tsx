import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-4 py-[22px] text-center text-xs text-[#A79E92]">
      <p>
        FirstSeat · New York ·{" "}
        <Link href="/terms" className="transition-colors hover:text-soft">
          Terms
        </Link>
        {" · "}
        <Link href="/privacy" className="transition-colors hover:text-soft">
          Privacy
        </Link>
      </p>
    </footer>
  );
}
