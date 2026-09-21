import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { SafeUser, UserRole } from "./types";
import { NextResponse } from "next/server";

const DEFAULT_SECRET = "wayward-atlas-dev-secret-key-999-secure-change-in-production";
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET;
const COOKIE_NAME = "wayward_session";

if (process.env.NODE_ENV === "production" && JWT_SECRET === DEFAULT_SECRET) {
  console.warn("⚠️ SECURITY WARNING: Using default development JWT_SECRET in production. Set a custom JWT_SECRET in your environment.");
}

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
    role: user.role as UserRole,
  };
}

/**
 * Enforces authentication and optionally specific role authorization.
 * Returns the SafeUser or an appropriate JSON error response.
 */
export async function requireUser(
  allowedRoles?: UserRole[]
): Promise<{ user: SafeUser; errorResponse: null } | { user: null; errorResponse: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Authentication required to access this resource" },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Insufficient permissions for this operation" },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}

export async function requireAdmin(): Promise<{ user: SafeUser; errorResponse: null } | { user: null; errorResponse: NextResponse }> {
  return requireUser(["ADMIN"]);
}

export async function requirePartnerOrAdmin(): Promise<{ user: SafeUser; errorResponse: null } | { user: null; errorResponse: NextResponse }> {
  return requireUser(["ADMIN", "PARTNER"]);
}

export function canViewTrip(
  trip: { isPrivate: boolean; createdById: string; minRole?: string; allowedUsers?: { userId: string }[] },
  user: SafeUser | null
): boolean {
  if (!trip.isPrivate && (!trip.minRole || trip.minRole === "PUBLIC" || trip.minRole === "VIEWER")) {
    return true;
  }
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "PARTNER" || user.canViewPrivate) return true;
  if (trip.createdById === user.id) return true;
  if (trip.allowedUsers?.some((au) => au.userId === user.id)) return true;
  if (user.role === "CLOSE_FRIEND" && (trip.minRole === "CLOSE_FRIEND" || trip.minRole === "VIEWER")) {
    return true;
  }
  return false;
}
