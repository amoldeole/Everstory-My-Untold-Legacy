"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Card, CardHeader, Input, Select } from "@/components/ui/Primitives";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { countWords, readingMinutes } from "@/lib/utils/text";

export interface EditorChapter {
  id: string;
  title: string;
  emoji: string;
}

export interface EditorPerson {
  id: string;
  name: string;
  relationship: string | null;
}

export interface EditorPhoto {
  id: string;
  filename: string;
  altText: string | null;
}

export interface EditorEntry {
  id: string;
  title: string;
  body: string;
  chapterId: string | null;
  occurredAt: string | null;
  location: string | null;
  mood: string | null;
  status: "draft" | "published";
  visibility: "private" | "shared" | "legacy";
  pinned: boolean;
  shareEnabled: boolean;
  shareToken: string | null;
  promptQuestion: string | null;
  promptFollowUp: string | null;
  tags: Array<{ id: string; name: string; color: string }>;
  people: Array<{ id: string; name: string; relationship: string | null }>;
  photos: EditorPhoto[];
  createdAt: string;
  updatedAt: string;
}

type SaveState = "saved" | "dirty" | "saving" | "error";

const MOODS = [
  "joyful",
  "nostalgic",
  "tender",
  "reflective",
  "grateful",
  "restless",
  "grieving",
  "angry",
  "hopeful",
  "amused",
];

export function EntryEditor({
  entry,
  chapters,
  people,
  appUrl,
}: {
  entry: EditorEntry;
  chapters: EditorChapter[];
  people: EditorPerson[];
  appUrl: string;
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState(entry.title);
  const [body, setBody] = useState(entry.body);
  const [chapterId, setChapterId] = useState(entry.chapterId ?? "");
  const [occurredAt, setOccurredAt] = useState(entry.occurredAt ?? "");
  const [location, setLocation] = useState(entry.location ?? "");
  const [mood, setMood] = useState(entry.mood ?? "");
  const [status, setStatus] = useState(entry.status);
  const [visibility, setVisibility] = useState(entry.visibility);
  const [pinned, setPinned] = useState(entry.pinned);

  const [tags, setTags] = useState(entry.tags);
  const [linked, setLinked] = useState(entry.people);
  const [photos, setPhotos] = useState(entry.photos);

  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [uploading, setUploading] = useState(false);

  const mounted = useRef(false);
  const dirtyRef = useRef(false);

  const words = useMemo(() => countWords(body), [body]);

  /* ------------------------------------------------------------------ save */

  const save = useCallback(async () => {
    setSaveState("saving");
    try {
      const response = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          chapterId: chapterId || null,
          occurredAt: occurredAt || null,
          location: location || null,
          mood: mood || null,
          status,
          visibility,
          pinned,
        }),
      });

      if (!response.ok) throw new Error(`Save failed (${response.status})`);

      dirtyRef.current = false;
      setSaveState("saved");
      router.refresh();
    } catch {
      setSaveState("error");
    }
  }, [entry.id, title, body, chapterId, occurredAt, location, mood, status, visibility, pinned, router]);

  // Debounced autosave. Skips the very first run so opening an entry does not
  // immediately mark it as edited.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    dirtyRef.current = true;
    setSaveState("dirty");
    const timer = setTimeout(() => void save(), 1200);
    return () => clearTimeout(timer);
  }, [title, body, chapterId, occurredAt, location, mood, status, visibility, pinned, save]);

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  /* -------------------------------------------------------------- shortcuts */

  const applyFormat = useCallback((before: string, after = before, placeholder = "text") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart: start, selectionEnd: end, value } = textarea;
    const selected = value.slice(start, end) || placeholder;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;

    setBody(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;

      if (event.key === "s") {
        event.preventDefault();
        void save();
      } else if (event.key === "b") {
        event.preventDefault();
        applyFormat("**", "**", "bold");
      } else if (event.key === "i") {
        event.preventDefault();
        applyFormat("*", "*", "italic");
      }
    },
    [applyFormat, save],
  );

  /* --------------------------------------------------------------- preview */

  const togglePreview = useCallback(async () => {
    if (showPreview) {
      setShowPreview(false);
      return;
    }
    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markdown: body }),
      });
      const data = (await response.json()) as { html?: string };
      setPreviewHtml(data.html ?? "");
      setShowPreview(true);
    } catch {
      setShowPreview(false);
    }
  }, [body, showPreview]);

  /* ------------------------------------------------------------------ tags */

  const addTag = useCallback(async () => {
    const name = tagDraft.trim();
    if (!name) return;
    const response = await fetch(`/api/entries/${entry.id}/links`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "tag", name }),
    });
    if (response.ok) {
      const data = (await response.json()) as { tag?: { id: string; name: string } };
      if (data.tag && !tags.some((tag) => tag.id === data.tag?.id)) {
        setTags((current) => [...current, { ...data.tag!, color: "brass" }]);
      }
      setTagDraft("");
    }
  }, [entry.id, tagDraft, tags]);

  const removeTag = useCallback(
    async (tagId: string) => {
      setTags((current) => current.filter((tag) => tag.id !== tagId));
      await fetch(`/api/entries/${entry.id}/links?kind=tag&id=${tagId}`, { method: "DELETE" });
    },
    [entry.id],
  );

  /* ---------------------------------------------------------------- people */

  const addPerson = useCallback(
    async (personId: string) => {
      const person = people.find((candidate) => candidate.id === personId);
      if (!person || linked.some((current) => current.id === personId)) return;
      setLinked((current) => [...current, person]);
      await fetch(`/api/entries/${entry.id}/links`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "person", personId }),
      });
    },
    [entry.id, linked, people],
  );

  const removePerson = useCallback(
    async (personId: string) => {
      setLinked((current) => current.filter((person) => person.id !== personId));
      await fetch(`/api/entries/${entry.id}/links?kind=person&id=${personId}`, { method: "DELETE" });
    },
    [entry.id],
  );

  /* ---------------------------------------------------------------- photos */

  const uploadPhoto = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("entryId", entry.id);
        const response = await fetch("/api/upload", { method: "POST", body: form });
        if (response.ok) {
          const data = (await response.json()) as {
            media?: { id: string; filename: string; byteSize: number };
          };
          if (data.media) {
            setPhotos((current) => [
              ...current,
              { id: data.media!.id, filename: data.media!.filename, altText: null },
            ]);
          }
          router.refresh();
        }
      } finally {
        setUploading(false);
      }
    },
    [entry.id, router],
  );

  const removePhoto = useCallback(async (photoId: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    await fetch(`/api/media/${photoId}`, { method: "DELETE" });
  }, []);

  const insertPhoto = useCallback((photoId: string, filename: string) => {
    setBody(
      (current) =>
        `${current}${current && !current.endsWith("\n") ? "\n\n" : ""}![${filename}](/api/media/${photoId})\n\n`,
    );
  }, []);

  /* -------------------------------------------------------------------- UI */

  const saveLabel: Record<SaveState, string> = {
    saved: "Saved",
    dirty: "Unsaved changes",
    saving: "Saving…",
    error: "Save failed — retry",
  };

  const shareUrl = entry.shareToken ? `${appUrl}/share/${entry.shareToken}` : null;
  const availablePeople = people.filter((person) => !linked.some((current) => current.id === person.id));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
      {/* --------------------------------------------------------- main pane */}
      <div className="min-w-0">
        {entry.promptQuestion ? (
          <Card className="mb-4 border-brass-400/50 bg-brass-300/10 p-4 dark:border-brass-700/40 dark:bg-brass-700/10">
            <p className="text-[11px] font-medium tracking-widest text-brass-700 uppercase dark:text-brass-300">
              Prompt
            </p>
            <p className="mt-1.5 font-serif text-[17px] leading-snug text-ink-900 dark:text-parchment-50">
              {entry.promptQuestion}
            </p>
            {entry.promptFollowUp ? (
              <p className="mt-1 text-[13px] italic text-ink-600 dark:text-parchment-400">
                {entry.promptFollowUp}
              </p>
            ) : null}
          </Card>
        ) : null}

        <Card className="overflow-hidden">
          {/* toolbar */}
          <div className="flex flex-wrap items-center gap-1 border-b border-parchment-300 px-3 py-2 dark:border-white/10">
            <ToolbarButton label="Bold" onClick={() => applyFormat("**", "**", "bold")}>
              <span className="font-bold">B</span>
            </ToolbarButton>
            <ToolbarButton label="Italic" onClick={() => applyFormat("*", "*", "italic")}>
              <span className="italic">I</span>
            </ToolbarButton>
            <ToolbarButton label="Heading" onClick={() => applyFormat("## ", "", "Heading")}>
              H2
            </ToolbarButton>
            <ToolbarButton label="Quote" onClick={() => applyFormat("> ", "", "Quoted line")}>
              &ldquo;
            </ToolbarButton>
            <ToolbarButton label="List" onClick={() => applyFormat("- ", "", "List item")}>
              •
            </ToolbarButton>
            <ToolbarButton label="Link" onClick={() => applyFormat("[", "](https://)", "link text")}>
              🔗
            </ToolbarButton>

            <span className="mx-1 h-5 w-px bg-parchment-300 dark:bg-white/10" />

            <button
              type="button"
              onClick={() => void togglePreview()}
              className={cn(
                "rounded-md px-2.5 py-1 text-[13px] font-medium transition",
                showPreview
                  ? "bg-brass-300/50 text-brass-700 dark:bg-brass-700/30 dark:text-brass-300"
                  : "text-ink-600 hover:bg-parchment-200 dark:text-parchment-300 dark:hover:bg-white/10",
              )}
            >
              {showPreview ? "Back to writing" : "Preview"}
            </button>

            <div className="ml-auto flex items-center gap-3">
              <span
                className={cn(
                  "text-[12px]",
                  saveState === "error" && "text-seal-600 dark:text-seal-400",
                  saveState === "saved" && "text-ink-500 dark:text-parchment-500",
                  (saveState === "dirty" || saveState === "saving") && "text-brass-600 dark:text-brass-300",
                )}
              >
                {saveState === "error" ? (
                  <button type="button" onClick={() => void save()} className="underline underline-offset-2">
                    {saveLabel[saveState]}
                  </button>
                ) : (
                  saveLabel[saveState]
                )}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void save()}
                disabled={saveState === "saving"}
              >
                Save
              </Button>
            </div>
          </div>

          {/* title */}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Give this memory a title"
            aria-label="Entry title"
            className="w-full border-b border-parchment-300 bg-transparent px-5 py-4 font-serif text-2xl font-semibold text-ink-900 placeholder:text-ink-400 focus:outline-none dark:border-white/10 dark:text-parchment-50 dark:placeholder:text-parchment-600"
          />

          {/* body */}
          {showPreview ? (
            <div
              className="prose-memoir px-5 py-6"
              // HTML is rendered and sanitised on the server by /api/preview.
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Start anywhere. Describe what you can see…"
              aria-label="Entry body"
              spellCheck
              className="min-h-[26rem] w-full resize-y bg-transparent px-5 py-5 font-serif text-[17px] leading-[1.85] text-ink-800 placeholder:text-ink-400 focus:outline-none dark:text-parchment-100 dark:placeholder:text-parchment-600"
            />
          )}

          <div className="flex flex-wrap items-center gap-4 border-t border-parchment-300 px-5 py-2.5 text-[12px] text-ink-500 dark:border-white/10 dark:text-parchment-500">
            <span>{words.toLocaleString()} words</span>
            <span>~{readingMinutes(words)} min read</span>
            <span className="hidden sm:inline">⌘S to save · ⌘B bold · ⌘I italic</span>
          </div>
        </Card>
      </div>

      {/* -------------------------------------------------------- side panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader title="Details" />
          <div className="space-y-3.5 p-4">
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600 dark:text-parchment-300">Chapter</span>
              <Select
                value={chapterId}
                onChange={(event) => setChapterId(event.target.value)}
                className="mt-1 h-9 text-[13px]"
              >
                <option value="">No chapter</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.emoji} {chapter.title}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="text-[12px] font-medium text-ink-600 dark:text-parchment-300">
                When it happened
              </span>
              <Input
                type="date"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
                className="mt-1 h-9 text-[13px]"
              />
            </label>

            <label className="block">
              <span className="text-[12px] font-medium text-ink-600 dark:text-parchment-300">Place</span>
              <Input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="City, street, room…"
                className="mt-1 h-9 text-[13px]"
                maxLength={160}
              />
            </label>

            <label className="block">
              <span className="text-[12px] font-medium text-ink-600 dark:text-parchment-300">Mood</span>
              <Select
                value={mood}
                onChange={(event) => setMood(event.target.value)}
                className="mt-1 h-9 text-[13px]"
              >
                <option value="">Not set</option>
                {MOODS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="text-[12px] font-medium text-ink-600 dark:text-parchment-300">Status</span>
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value as typeof status)}
                className="mt-1 h-9 text-[13px]"
              >
                <option value="draft">Draft</option>
                <option value="published">Finished</option>
              </Select>
            </label>

            <label className="block">
              <span className="text-[12px] font-medium text-ink-600 dark:text-parchment-300">
                Who can see this
              </span>
              <Select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as typeof visibility)}
                className="mt-1 h-9 text-[13px]"
              >
                <option value="private">Only me</option>
                <option value="shared">Anyone with the link</option>
                <option value="legacy">My legacy contacts</option>
              </Select>
            </label>

            <label className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(event) => setPinned(event.target.checked)}
                className="h-4 w-4 rounded border-parchment-400 accent-brass-600"
              />
              <span className="text-[13px] text-ink-700 dark:text-parchment-200">Pin to the top</span>
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader title="People" />
          <div className="space-y-2 p-4">
            {linked.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {linked.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => void removePerson(person.id)}
                      className="group inline-flex items-center gap-1 rounded-full bg-parchment-200 px-2.5 py-1 text-[12px] text-ink-700 transition hover:bg-seal-500 hover:text-white dark:bg-white/10 dark:text-parchment-200"
                      title="Remove"
                    >
                      {person.name}
                      <span aria-hidden="true">×</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-500 dark:text-parchment-500">Nobody tagged yet.</p>
            )}

            {availablePeople.length > 0 ? (
              <Select
                value=""
                onChange={(event) => {
                  if (event.target.value) void addPerson(event.target.value);
                }}
                className="h-9 text-[13px]"
              >
                <option value="">Add a person…</option>
                {availablePeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                    {person.relationship ? ` (${person.relationship})` : ""}
                  </option>
                ))}
              </Select>
            ) : (
              <p className="text-[12px] text-ink-400 dark:text-parchment-500">
                <Link href="/people" className="underline underline-offset-2">
                  Manage your people
                </Link>
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Tags" />
          <div className="space-y-2 p-4">
            {tags.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <li key={tag.id}>
                    <button
                      type="button"
                      onClick={() => void removeTag(tag.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-brass-300/40 px-2.5 py-1 text-[12px] text-brass-700 transition hover:bg-seal-500 hover:text-white dark:bg-brass-700/25 dark:text-brass-300"
                      title="Remove"
                    >
                      {tag.name}
                      <span aria-hidden="true">×</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex gap-2">
              <Input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void addTag();
                  }
                }}
                placeholder="Add a tag"
                className="h-9 text-[13px]"
                maxLength={40}
              />
              <Button variant="subtle" size="sm" onClick={() => void addTag()} disabled={!tagDraft.trim()}>
                Add
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Photos" />
          <div className="space-y-3 p-4">
            {photos.length > 0 ? (
              <ul className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <li key={photo.id} className="group relative">
                    <img
                      src={`/api/media/${photo.id}`}
                      alt={photo.altText ?? photo.filename}
                      className="aspect-square w-full rounded-md border border-parchment-300 object-cover dark:border-white/10"
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-md bg-ink-900/70 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => insertPhoto(photo.id, photo.filename)}
                        title="Insert into text"
                        className="rounded p-1 text-[11px] text-white hover:bg-white/20"
                      >
                        Insert
                      </button>
                      <button
                        type="button"
                        onClick={() => void removePhoto(photo.id)}
                        title="Delete"
                        className="rounded p-1 text-[11px] text-white hover:bg-seal-500"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-500 dark:text-parchment-500">No photos attached.</p>
            )}

            <label className="block">
              <span className="sr-only">Upload a photo</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadPhoto(file);
                  event.target.value = "";
                }}
                className="block w-full text-[12px] text-ink-600 file:mr-3 file:rounded-md file:border-0 file:bg-parchment-200 file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-ink-800 hover:file:bg-parchment-300 dark:text-parchment-400 dark:file:bg-white/10 dark:file:text-parchment-100"
              />
            </label>
            {uploading ? <p className="text-[12px] text-brass-600 dark:text-brass-300">Uploading…</p> : null}
          </div>
        </Card>

        {visibility === "shared" && shareUrl ? (
          <Card className="p-4">
            <p className="text-[12px] font-medium text-ink-700 dark:text-parchment-200">Public link</p>
            <p className="mt-1 break-all text-[12px] text-brass-700 dark:text-brass-300">{shareUrl}</p>
            <CopyButton value={shareUrl} />
          </Card>
        ) : null}

        <Card className="p-4">
          <div className="space-y-1 text-[11px] text-ink-500 dark:text-parchment-500">
            <p>Created {new Date(entry.createdAt).toLocaleDateString()}</p>
            <p>Last edited {new Date(entry.updatedAt).toLocaleString()}</p>
          </div>
          <div className="mt-3">
            <DeleteEntryButton entryId={entry.id} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-[13px] text-ink-600 transition hover:bg-parchment-200 hover:text-ink-900 dark:text-parchment-300 dark:hover:bg-white/10 dark:hover:text-parchment-50"
    >
      {children}
    </button>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="subtle"
      size="sm"
      className="mt-2 w-full"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard blocked — the URL is visible to copy by hand */
        }
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

function DeleteEntryButton({ entryId }: { entryId: string }) {
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  if (!confirming) {
    return (
      <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setConfirming(true)}>
        Delete this entry
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[12px] text-seal-600 dark:text-seal-400">
        Delete permanently? This cannot be undone.
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="flex-1"
          onClick={async () => {
            await fetch(`/api/entries/${entryId}`, { method: "DELETE" });
            router.push("/entries");
            router.refresh();
          }}
        >
          Yes, delete
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={() => setConfirming(false)}
        >
          Keep
        </Button>
      </div>
    </div>
  );
}
