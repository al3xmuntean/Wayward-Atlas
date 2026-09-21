import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const demoEmail = "google.friend@gmail.com";
  const demoName = "Alex Friend (Google)";

  let user = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: demoEmail,
        name: demoName,
        passwordHash: "oauth-google-managed-user",
        role: "VIEWER",
        canViewPrivate: false,
      },
    });
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const response = NextResponse.redirect(new URL("/", origin));
  response.cookies.set("wayward_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  return response;
}
