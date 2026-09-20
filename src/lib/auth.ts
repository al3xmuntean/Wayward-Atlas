import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { SafeUser } from "./types";

const JWT_SECRET = process.env.JWT_SECRET || "wayward-atlas-dev-secret-key-999-secure-change-in-production";
const COOKIE_NAME = "wayward_session";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: { id: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { id: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, email: true, name: true, role: true, canViewPrivate: true },
  });

  if (!user) return null;
  return {
    ...user,
    role: user.role as "ADMIN" | "USER" | "VIEWER",
  };
}

export function canViewTrip(trip: { isPrivate: boolean; createdById: string; allowedUsers?: { userId: string }[] }, user: SafeUser | null): boolean {
  if (!trip.isPrivate) return true;
  if (!user) return false;
  if (user.role === "ADMIN" || user.canViewPrivate) return true;
  if (trip.createdById === user.id) return true;
  if (trip.allowedUsers?.some((au) => au.userId === user.id)) return true;
  return false;
}
