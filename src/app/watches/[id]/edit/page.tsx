import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EditWatchForm } from "@/components/watches/edit-watch-form";
import { requireAppUser } from "@/lib/auth/dal";
import { addDays, civilDateInZone, formatCivilDate } from "@/lib/time";
import { getWatchForUser } from "@/lib/watches/queries";
import { MAX_DAYS_AHEAD } from "@/lib/watches/schemas";

export const metadata: Metadata = {
  title: "Edit watch — FirstSeat",
};

/** Postgres rejects a malformed uuid outright, so it is filtered before the query runs. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditWatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAppUser();
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  // Scoped to this user. Another account's watch comes back null and 404s here, exactly
  // like an id that never existed — the page cannot be used to probe for real ids.
  const watch = await getWatchForUser(user.id, id);

  if (!watch) {
    notFound();
  }

  const today = civilDateInZone(new Date(), user.timezone);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="space-y-1">
        <Link
          href="/dashboard"
          className="text-sm text-muted transition-opacity hover:opacity-70"
        >
          ← Your watches
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Edit watch</h1>
        <p className="text-sm text-muted">
          Change the date, party size or meal. We will recalculate the drop moment.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6">
        <EditWatchForm
          watch={watch}
          earliestDate={formatCivilDate(today)}
          latestDate={formatCivilDate(addDays(today, MAX_DAYS_AHEAD))}
          timezone={user.timezone}
        />
      </section>
    </main>
  );
}
