import { db } from "@/lib/db";

/** Serves uploaded images by their unguessable id (e.g. /media/9f…c1.jpg). */
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const match = parts.length === 1 ? /^([a-f0-9]{32})\.(jpg|png|webp)$/.exec(parts[0]) : null;
  if (!match) return new Response("Not found", { status: 404 });
  const file = await db.mediaFile.findUnique({ where: { publicId: match[1] } });
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
