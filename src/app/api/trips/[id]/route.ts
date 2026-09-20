import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Doar administratorul poate șterge călătorii" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.trip.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete trip error:", error);
    return NextResponse.json({ error: "Eroare la ștergerea călătoriei" }, { status: 500 });
  }
}
