import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Trebuie să fii autentificat pentru a lăsa un comentariu" }, { status: 401 });
    }

    const { id: tripId } = await params;
    const { content } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Comentariul nu poate fi gol" }, { status: 400 });
    }

    // Verify trip exists and user has view permission
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { allowedUsers: true },
    });

    if (!trip) {
      return NextResponse.json({ error: "Călătoria nu a fost găsită" }, { status: 404 });
    }

    if (trip.isPrivate && user.role !== "ADMIN" && trip.createdById !== user.id) {
      const isAllowed = trip.allowedUsers.some((au) => au.userId === user.id);
      if (!isAllowed) {
        return NextResponse.json({ error: "Nu ai permisiunea de a comenta la această călătorie privată" }, { status: 403 });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        tripId,
        userId: user.id,
        content: content.trim(),
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      comment: {
        id: comment.id,
        tripId: comment.tripId,
        userId: comment.userId,
        userName: comment.user.name,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json({ error: "Eroare la adăugarea comentariului" }, { status: 500 });
  }
}
