"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import {
  assertPasswordPolicy,
  hashPassword,
  isPasswordPolicyError,
  verifyPassword,
} from "@/lib/auth/password";
import { destroyAllSessionsForUser } from "@/lib/auth/session";
import { deleteUserData } from "@/lib/onboarding";
import { getStorage } from "@/lib/storage";

export interface SettingsFormState {
  error?: string;
  success?: string;
}

export async function updateProfileAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 80) {
    return { error: "Please enter a name between 1 and 80 characters." };
  }

  const db = await getDb();
  const timezone = String(formData.get("timezone") ?? "").trim();

  await db
    .update(users)
    .set({
      name,
      bio: String(formData.get("bio") ?? "").trim() || null,
      timezone: timezone.length > 0 && timezone.length <= 64 ? timezone : user.timezone,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: "Profile updated." };
}

export async function updatePreferencesAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireUser();

  const goal = Number.parseInt(String(formData.get("writingGoalWords") ?? "500"), 10);
  const visibility = String(formData.get("defaultEntryVisibility") ?? "private");

  if (!Number.isFinite(goal) || goal < 50 || goal > 100_000) {
    return { error: "Set a weekly word goal between 50 and 100,000." };
  }
  if (!["private", "shared", "legacy"].includes(visibility)) {
    return { error: "That is not a valid default visibility." };
  }

  const db = await getDb();
  await db
    .update(users)
    .set({
      preferences: {
        ...user.preferences,
        writingGoalWords: goal,
        defaultEntryVisibility: visibility as "private" | "shared" | "legacy",
      },
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: "Preferences saved." };
}

export async function changePasswordAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireUser();
  const db = await getDb();

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next !== confirm) return { error: "The new passwords do not match." };

  const rows = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const stored = rows[0]?.passwordHash ?? null;

  if (stored && !(await verifyPassword(current, stored))) {
    return { error: "Your current password is incorrect." };
  }

  try {
    assertPasswordPolicy(next);
  } catch (error) {
    if (isPasswordPolicyError(error)) return { error: error.message };
    throw error;
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  // Sign out every other device — but not this one, or the user is kicked out
  // of the flow that just succeeded.
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const currentToken = store.get("everstory_session")?.value;
  await destroyAllSessionsForUser(user.id, currentToken);

  return { success: "Password changed. Other devices have been signed out." };
}

/**
 * Deletes the account and every byte that belongs to it.
 *
 * Uploads are removed first; if storage is unreachable we still delete the
 * database rows, because leaving personal writing behind would be worse.
 */
export async function deleteAccountAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireUser();

  if (String(formData.get("confirm") ?? "").trim() !== "DELETE") {
    return { error: "Type DELETE (in capitals) to confirm." };
  }

  const db = await getDb();

  try {
    const { media } = await import("@/db/schema");
    const files = await db.select().from(media).where(eq(media.userId, user.id));
    const storage = getStorage();
    await Promise.all(
      files.map(async (file) => {
        try {
          await storage.delete(file.storageKey);
        } catch {
          /* keep going */
        }
      }),
    );
  } catch {
    /* keep going */
  }

  await db
    .delete(users)
    .where(eq(users.id, user.id))
    .catch(async () => {
      await deleteUserData(db, user.id);
    });

  redirect("/?deleted=1");
}

/* --------------------------------------------------------- legacy contacts */

/**
 * Adds someone who should be able to read the entries you marked "legacy".
 *
 * The access token is generated here and never shown again in full — it is
 * meant to be copied into a letter, a will, or a message to that person.
 */
export async function addLegacyContactAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const relationship = String(formData.get("relationship") ?? "").trim();

  if (name.length < 1 || name.length > 80) return { error: "Enter the person's name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "That does not look like an email address." };

  const { legacyContacts } = await import("@/db/schema");
  const db = await getDb();

  const existing = await db
    .select({ id: legacyContacts.id })
    .from(legacyContacts)
    .where(and(eq(legacyContacts.userId, user.id), eq(legacyContacts.email, email)))
    .limit(1);

  if (existing.length > 0) return { error: "That person is already a legacy contact." };

  const { randomBytes } = await import("node:crypto");
  await db.insert(legacyContacts).values({
    userId: user.id,
    name,
    email,
    relationship: relationship || null,
    accessToken: randomBytes(24).toString("base64url"),
  });

  revalidatePath("/settings");
  return { success: `${name} added. Copy their link and put it somewhere safe.` };
}

export async function revokeLegacyContactAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("contactId") ?? "");
  if (!id) return;

  const { legacyContacts } = await import("@/db/schema");
  const db = await getDb();

  await db
    .update(legacyContacts)
    .set({ revokedAt: new Date() })
    .where(and(eq(legacyContacts.id, id), eq(legacyContacts.userId, user.id)));

  revalidatePath("/settings");
}
