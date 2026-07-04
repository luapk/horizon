import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const SESSION_SECRET = process.env.SESSION_SECRET;
const AUTH_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH;
const AUTH_PASSWORD = process.env.AUTH_PASSWORD;
const COOKIE_NAME = "horizon_session";

if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET env var is required (used to sign session cookies)");
}
if (!AUTH_PASSWORD_HASH && !AUTH_PASSWORD) {
  throw new Error("Set AUTH_PASSWORD_HASH (bcrypt hash, preferred) or AUTH_PASSWORD (plaintext, dev only)");
}

export async function verifyPassword(candidate: string): Promise<boolean> {
  if (AUTH_PASSWORD_HASH) return bcrypt.compare(candidate, AUTH_PASSWORD_HASH);
  return candidate === AUTH_PASSWORD;
}

export function issueSessionCookie(res: Response): void {
  const token = jwt.sign({ sub: "operator" }, SESSION_SECRET!, { expiresIn: "12h" });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 12 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: "not authenticated" });
    return;
  }
  try {
    jwt.verify(token, SESSION_SECRET!);
    next();
  } catch {
    res.status(401).json({ error: "session expired or invalid" });
  }
}
