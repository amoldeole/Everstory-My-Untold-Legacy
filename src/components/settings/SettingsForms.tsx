"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/Primitives";
import { ThemeToggle } from "@/components/layout/AppShell";
import {
  changePasswordAction,
  deleteAccountAction,
  updatePreferencesAction,
  updateProfileAction,
  type SettingsFormState,
} from "@/server/actions/settings";

const EMPTY: SettingsFormState = {};

function Feedback({ state }: { state: SettingsFormState }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

export function ProfileForm({
  name,
  email,
  bio,
  timezone,
}: {
  name: string;
  email: string;
  bio: string;
  timezone: string;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input name="name" defaultValue={name} required maxLength={80} />
        </Field>
        <Field label="Email" hint="Email cannot be changed yet.">
          <Input value={email} disabled readOnly />
        </Field>
      </div>
      <Field label="A line about you" hint="Appears on the title page of exports.">
        <Textarea name="bio" defaultValue={bio} rows={2} maxLength={280} />
      </Field>
      <Field label="Timezone">
        <Input
          name="timezone"
          defaultValue={timezone}
          placeholder={Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}
          maxLength={64}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

export function PreferencesForm({
  goal,
  visibility,
}: {
  goal: number;
  visibility: "private" | "shared" | "legacy";
}) {
  const [state, action, pending] = useActionState(updatePreferencesAction, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <Field label="Weekly word goal" hint="Used for the progress bar on your dashboard.">
        <Input
          name="writingGoalWords"
          type="number"
          min={50}
          max={100000}
          step={50}
          defaultValue={goal}
          className="max-w-40"
        />
      </Field>
      <Field label="Default visibility for new entries">
        <Select name="defaultEntryVisibility" defaultValue={visibility} className="max-w-64">
          <option value="private">Only me</option>
          <option value="shared">Anyone with the link</option>
          <option value="legacy">My legacy contacts</option>
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}

export function AppearanceCard() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-ink-800 dark:text-parchment-100">Theme</p>
        <p className="mt-0.5 text-[13px] text-ink-500 dark:text-parchment-400">
          Stored on this device. Follows your system setting until you choose.
        </p>
      </div>
      <ThemeToggle className="border border-parchment-400 dark:border-white/12" />
    </div>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      {hasPassword ? (
        <Field label="Current password">
          <Input name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
      ) : (
        <Alert tone="info">
          You signed in with a connected provider, so there is no password yet. Set one here and you will be
          able to sign in with it as well.
        </Alert>
      )}
      <Field label="New password" hint="At least 10 characters.">
        <Input name="newPassword" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Field label="Confirm new password">
        <Input name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}

export function DangerZone({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(deleteAccountAction, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className="rounded-lg border border-seal-400/50 bg-seal-500/5 p-4">
        <p className="text-sm font-medium text-seal-600 dark:text-seal-400">Delete everything</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-600 dark:text-parchment-400">
          This removes your account, every entry, every uploaded photo and your timeline. It cannot be undone.
          Export first — that is what the button on the Export page is for.
        </p>
        {hasPassword ? null : (
          <p className="mt-2 text-[13px] text-ink-500 dark:text-parchment-500">
            You do not have a password, so confirmation only needs the word below.
          </p>
        )}
        <Field label="Type DELETE to confirm" className="mt-3 max-w-56">
          <Input name="confirm" placeholder="DELETE" autoComplete="off" />
        </Field>
        <Button type="submit" variant="danger" className="mt-3" disabled={pending}>
          {pending ? "Deleting…" : "Delete my account and all my data"}
        </Button>
      </div>
    </form>
  );
}
