import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacSha256(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// No 0/O/1/I to keep codes readable when dictated over the phone.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

export function registrationNumber(): string {
  const yy = String(new Date().getUTCFullYear()).slice(2);
  return `RP${yy}-${randomCode(6)}`;
}

export function paymentReference(): string {
  return `PAY-${randomCode(10)}`;
}

export function ticketNumber(): string {
  return `TKT-${randomCode(7)}`;
}

export function attemptPublicId(): string {
  return randomBytes(16).toString("hex");
}

export function referralCode(): string {
  return randomCode(8);
}
