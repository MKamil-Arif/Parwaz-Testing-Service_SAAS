import bcrypt from "bcryptjs";

const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Used to keep login timing similar whether or not the email exists. */
export const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5JgUdrQJ1C0bWZgHzCw0F1E3uQyHk7a";
