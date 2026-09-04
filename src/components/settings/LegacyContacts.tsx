"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Alert, Field, Input } from "@/components/ui/Primitives";
import { addLegacyContactAction, revokeLegacyContactAction } from "@/server/actions/settings";

export interface LegacyContactView {
  id: string;
  name: string;
  email: string;
  relationship: string | null;
  accessToken: string;
  revokedAt: string | null;
}

export function LegacyContacts({ contacts, appUrl }: { contacts: LegacyContactView[]; appUrl: string }) {
  const [state, action, pending] = useActionState(addLegacyContactAction, {});

  return (
    <div className="space-y-5">
      {contacts.length > 0 ? (
        <ul className="divide-y divide-parchment-300 rounded-lg border border-parchment-300 dark:divide-white/8 dark:border-white/10">
          {contacts.map((contact) => {
            const revoked = Boolean(contact.revokedAt);
            return (
              <li key={contact.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-800 dark:text-parchment-100">
                      {contact.name}
                      {revoked ? (
                        <span className="ml-2 text-[11px] text-seal-600 dark:text-seal-400">(revoked)</span>
                      ) : null}
                    </p>
                    <p className="text-[13px] text-ink-500 dark:text-parchment-500">
                      {contact.email}
                      {contact.relationship ? ` · ${contact.relationship}` : ""}
                    </p>
                  </div>
                  {revoked ? null : (
                    <form action={revokeLegacyContactAction}>
                      <input type="hidden" name="contactId" value={contact.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Revoke
                      </Button>
                    </form>
                  )}
                </div>
                {revoked ? null : (
                  <div className="mt-2.5 rounded-md bg-parchment-200 px-3 py-2 dark:bg-white/5">
                    <p className="text-[10px] tracking-widest text-ink-500 uppercase dark:text-parchment-500">
                      Their private link
                    </p>
                    <p className="mt-0.5 break-all font-mono text-[11px] text-brass-700 dark:text-brass-300">
                      {appUrl}/legacy/{contact.accessToken}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[13px] text-ink-500 dark:text-parchment-500">
          Nobody yet. Legacy contacts can read the entries you set to “My legacy contacts”.
        </p>
      )}

      <form action={action} className="space-y-3 border-t border-parchment-300 pt-4 dark:border-white/10">
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
        {state.success ? <Alert tone="success">{state.success}</Alert> : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name" className="sm:col-span-1">
            <Input name="name" required maxLength={80} placeholder="Who is this for?" />
          </Field>
          <Field label="Email" className="sm:col-span-1">
            <Input name="email" type="email" required placeholder="them@example.com" />
          </Field>
          <Field label="Relationship" className="sm:col-span-1">
            <Input name="relationship" maxLength={60} placeholder="Daughter, oldest friend…" />
          </Field>
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add legacy contact"}
        </Button>
      </form>
    </div>
  );
}
