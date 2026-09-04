import { z } from "zod";

import { renderMarkdown } from "@/lib/markdown";
import { authenticate, apiError, json, parseBody, rateLimit } from "@/server/api/helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({ markdown: z.string().max(400_000).default("") });

/**
 * Renders Markdown to sanitised HTML on the server.
 *
 * Keeping the renderer and sanitiser server-side means the editor bundle stays
 * small, and — more importantly — means untrusted text is never parsed by a
 * browser-side sanitiser that could be bypassed by a crafted client.
 */
export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;

  const limit = rateLimit(`preview:${auth.user.id}`, 120, 60_000);
  if (!limit.ok) return apiError("Too many requests.", 429);

  const body = await parseBody(request, schema);
  if (!body.ok) return body.response;

  return json({ html: renderMarkdown(body.data.markdown) });
}
