import type { Metadata } from "next";
import { eq } from "drizzle-orm";

import { Card, CardHeader, PageHeader } from "@/components/ui/Primitives";
import {
  AppearanceCard,
  DangerZone,
  PasswordForm,
  PreferencesForm,
  ProfileForm,
} from "@/components/settings/SettingsForms";
import { LegacyContacts } from "@/components/settings/LegacyContacts";
import { getDb } from "@/db";
import { accounts, legacyContacts, users } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { activeDatabaseDescription } from "@/db";
import { describeDatabase } from "@/db/config";
import { getEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const db = await getDb();

  const [row, linked, contacts] = await Promise.all([
    db
      .select({ passwordHash: users.passwordHash, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1),
    db.select({ provider: accounts.provider }).from(accounts).where(eq(accounts.userId, user.id)),
    db
      .select()
      .from(legacyContacts)
      .where(eq(legacyContacts.userId, user.id))
      .orderBy(legacyContacts.createdAt),
  ]);

  const hasPassword = Boolean(row[0]?.passwordHash);
  const env = getEnv();

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your profile, your preferences, and the one button you should never need."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader title="Profile" description="How your book introduces you" />
          <div className="p-5">
            <ProfileForm name={user.name} email={user.email} bio={user.bio ?? ""} timezone={user.timezone} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Writing" description="Goals and defaults" />
          <div className="p-5">
            <PreferencesForm
              goal={user.preferences.writingGoalWords ?? 500}
              visibility={user.preferences.defaultEntryVisibility ?? "private"}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Appearance" />
          <div className="p-5">
            <AppearanceCard />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Password"
            description={
              linked.length > 0
                ? `Also connected: ${linked.map((account) => account.provider).join(", ")}`
                : undefined
            }
          />
          <div className="p-5">
            <PasswordForm hasPassword={hasPassword} />
          </div>
        </Card>

        <Card>
          <CardHeader title="This installation" description="Where your data actually lives" />
          <div className="space-y-3 p-5 text-[13px]">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-ink-600 dark:text-parchment-400">Database</span>
              <span className="text-right font-mono text-[12px] text-ink-800 dark:text-parchment-100">
                {activeDatabaseDescription()}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-ink-600 dark:text-parchment-400">Uploads</span>
              <span className="text-right text-ink-800 dark:text-parchment-100">
                {env.STORAGE_DRIVER === "s3" ? "S3-compatible object storage" : "Local disk"}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-ink-600 dark:text-parchment-400">Sign-in</span>
              <span className="text-right text-ink-800 dark:text-parchment-100">
                {env.AUTH_MODE === "single" ? "Single user" : "Email and password"}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-ink-600 dark:text-parchment-400">Environment</span>
              <span className="text-right text-ink-800 dark:text-parchment-100">{env.NODE_ENV}</span>
            </div>
            <p className="pt-2 text-[12px] leading-relaxed text-ink-500 dark:text-parchment-500">
              {describeDatabase().includes("embedded")
                ? "Running on the embedded database — perfect for one machine. Set DATABASE_URL to move to a real Postgres server."
                : "Connected to a Postgres server. Make sure you have backups."}
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Legacy contacts"
            description="People who can read everything you marked “My legacy contacts”"
          />
          <div className="p-5">
            <LegacyContacts
              appUrl={env.NEXT_PUBLIC_APP_URL}
              contacts={contacts.map((contact) => ({
                id: contact.id,
                name: contact.name,
                email: contact.email,
                relationship: contact.relationship,
                accessToken: contact.accessToken,
                revokedAt: contact.revokedAt ? contact.revokedAt.toISOString() : null,
              }))}
            />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Danger zone" />
          <div className="p-5">
            <DangerZone hasPassword={hasPassword} />
          </div>
        </Card>
      </div>
    </>
  );
}
