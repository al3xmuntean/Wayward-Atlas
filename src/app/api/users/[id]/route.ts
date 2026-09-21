import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function handleUpdate(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Only administrator can modify user roles" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { role, canViewPrivate } = body;

    const validRoles = ["ADMIN", "PARTNER", "CLOSE_FRIEND", "VIEWER"];
    const updateData: any = {};
    if (role && validRoles.includes(role)) {
      updateData.role = role;
      if (role === "ADMIN" || role === "PARTNER") {
        updateData.canViewPrivate = true;
      }
    }
    if (typeof canViewPrivate === "boolean") {
      updateData.canViewPrivate = canViewPrivate;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        canViewPrivate: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleUpdate(req, context);
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleUpdate(req, context);
}
