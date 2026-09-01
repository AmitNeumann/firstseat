/**
 * Data-layer contract tests. They do not open Postgres.
 *
 * Local development and production share the same Supabase project. Inserting and deleting
 * rows from the test suite would mutate live diner data, and standing up a throwaway
 * Postgres plus five Prisma migrations is more infrastructure than the remaining timeline
 * can absorb. These tests lock the two things that would otherwise only exist as comments:
 * ON DELETE CASCADE in the schema, and userId scoping on watch reads.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  watch: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { getWatchForUser, listWatchesForUser } from "@/lib/watches/queries";

const ROOT = join(import.meta.dirname, "..");

describe("schema cascade deletes", () => {
  const schema = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");
  const migration = readFileSync(
    join(ROOT, "prisma/migrations/20260819180426_init/migration.sql"),
    "utf8",
  );

  it("declares Prisma cascades from users → watches → drop alerts → notifications", () => {
    expect(schema).toMatch(
      /user\s+User\s+@relation\(fields: \[userId\], references: \[id\], onDelete: Cascade\)/,
    );
    expect(schema).toMatch(
      /watch\s+Watch\s+@relation\(fields: \[watchId\], references: \[id\], onDelete: Cascade\)/,
    );
    expect(schema).toMatch(
      /dropAlert\s+DropAlert\s+@relation\(fields: \[dropAlertId\], references: \[id\], onDelete: Cascade\)/,
    );
  });

  it("ships the same cascades in the applied migration SQL", () => {
    expect(migration).toContain(
      'FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("watch_id") REFERENCES "watches"("id") ON DELETE CASCADE',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("drop_alert_id") REFERENCES "drop_alerts"("id") ON DELETE CASCADE',
    );
  });

  it("deletes an account's application row by the signed-in user's id, not a form field", () => {
    const actions = readFileSync(join(ROOT, "src/lib/auth/actions.ts"), "utf8");

    expect(actions).toContain("await prisma.user.delete({ where: { id: user.id } })");
    expect(actions).toContain("The id never comes from the form");
  });

  it("creates a watch with userId from the session, never from the submitted form", () => {
    const actions = readFileSync(join(ROOT, "src/lib/watches/actions.ts"), "utf8");

    expect(actions).toContain("userId: user.id");
    expect(actions).toContain("userId comes from requireAppUser, never from the form");
    expect(actions).not.toMatch(/field\(formData,\s*"userId"\)/);
  });
});

describe("watch query scoping", () => {
  beforeEach(() => {
    prismaMock.watch.findMany.mockReset();
    prismaMock.watch.findFirst.mockReset();
    prismaMock.watch.findMany.mockResolvedValue([]);
    prismaMock.watch.findFirst.mockResolvedValue(null);
  });

  it("lists watches only for the given user", async () => {
    await listWatchesForUser("user-a");

    expect(prismaMock.watch.findMany).toHaveBeenCalledOnce();
    expect(prismaMock.watch.findMany.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-a" }),
      }),
    );
  });

  it("looks up a watch by both id and owner, so another user's row is not found", async () => {
    const result = await getWatchForUser("user-a", "watch-1");

    expect(result).toBeNull();
    expect(prismaMock.watch.findFirst).toHaveBeenCalledOnce();
    expect(prismaMock.watch.findFirst.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({ id: "watch-1", userId: "user-a" }),
      }),
    );
  });
});
