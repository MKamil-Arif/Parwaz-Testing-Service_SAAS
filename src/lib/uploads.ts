import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

/** Kept under Vercel's 4.5 MB request-body limit. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export const IMAGE_TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;
type Ext = keyof typeof IMAGE_TYPES;

/** Detects the real image type from its first bytes (never trust the file name or browser MIME type). */
export function sniffImage(buf: Buffer): Ext | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

/**
 * Stores a validated image in the database (works locally and on serverless hosts such as Vercel,
 * which have no persistent disk) under an unguessable id; served by /media/[...path].
 */
export async function saveImage(file: File): Promise<{ url: string } | { error: string }> {
  if (file.size === 0) return { error: "The file is empty." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Images must be 4 MB or smaller." };
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniffImage(buf);
  if (!ext) return { error: "Only JPG, PNG or WebP images are allowed." };
  const publicId = randomBytes(16).toString("hex");
  await db.mediaFile.create({ data: { publicId, contentType: IMAGE_TYPES[ext], size: buf.length, data: buf } });
  return { url: `/media/${publicId}.${ext}` };
}
