import Link from "next/link";

/**
 * Shared frame for the signup and login pages.
 *
 * A route group, so `(auth)` adds this layout without becoming a path segment: the pages
 * below it stay at `/login` and `/signup`.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <Link
        href="/"
        className="text-lg font-semibold tracking-tight transition-opacity hover:opacity-70"
      >
        FirstSeat
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </main>
  );
}
