import type { Metadata } from "next";

import { FormAlert } from "@/components/forms/fields";
import { DeleteAccount } from "@/components/settings/delete-account";
import { ProfileForm } from "@/components/settings/profile-form";
import { SettingsCard } from "@/components/settings/settings-card";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { requireAppUser } from "@/lib/auth/dal";
import { listIanaTimezones } from "@/lib/time";

export const metadata: Metadata = {
  title: "Settings — FirstSeat",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireAppUser();
  const { saved } = await searchParams;
  const timezones = listIanaTimezones();
  const options = timezones.includes(user.timezone)
    ? timezones
    : [user.timezone, ...timezones];

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader signedIn user={user} />

      <main
        className="mx-auto flex w-full max-w-[540px] flex-1 flex-col gap-5
                   px-[clamp(14px,4vw,28px)] pt-[clamp(22px,5vw,40px)] pb-20"
      >
        <header className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[clamp(28px,5.4vw,36px)] font-normal tracking-[-0.02em] text-espresso">
            Settings
          </h1>
          <p className="font-serif text-[18px] font-light leading-normal text-soft">
            Your account, how we address you, and the clock My Watches uses.
          </p>
        </header>

        <SettingsCard>
          {saved && (
            <div className="mb-4">
              <FormAlert tone="info">Saved.</FormAlert>
            </div>
          )}
          <ProfileForm
            firstName={user.firstName}
            lastName={user.lastName}
            email={user.email}
            timezone={user.timezone}
            timezones={options}
          />
          <DeleteAccount />
        </SettingsCard>
      </main>

      <SiteFooter />
    </div>
  );
}
