import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, canViewTrip } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const MAX_COMMENT_LENGTH = 1000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit("comment", clientIp, 20, 60000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Comment rate limit exceeded. Please retry in ${rateLimit.resetInSeconds} seconds.` },
        { status: 429 }
      );
    }

    const { user, errorResponse } = await requireUser();
    if (errorResponse) {
      return errorResponse;
    }

    const { id: tripId } = await params;
    const body = await req.json().catch(() => ({}));
    const { content } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Comment content cannot be empty" }, { status: 400 });
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `Comment exceeds maximum allowed length of ${MAX_COMMENT_LENGTH} characters.` },
        { status: 400 }
      );
    }

    // Verify trip exists and user has view permission
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { allowedUsers: true },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (!canViewTrip(trip, user)) {
      return NextResponse.json(
        { error: "You do not have permission to comment on this private trip" },
        { status: 403 }
      );
    }

    const comment = await prisma.comment.create({
      data: {
        tripId,
        userId: user.id,
        content: trimmedContent,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
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
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
