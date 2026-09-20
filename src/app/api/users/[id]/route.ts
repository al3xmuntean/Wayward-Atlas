import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Doar administratorul poate modifica rolurile utilizatorilor" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { role, canViewPrivate } = body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(role ? { role } : {}),
        ...(typeof canViewPrivate === "boolean" ? { canViewPrivate } : {}),
      },
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
    return NextResponse.json({ error: "Eroare la actualizarea utilizatorului" }, { status: 500 });
  }
}
