import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractClientGeo } from "@/lib/geoUtils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const photo = await prisma.photo.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const { ip, countryCode, countryName, userAgent } = extractClientGeo(req);

    // Debounce: Avoid spamming duplicate views from same IP for same photo within 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentView = await prisma.photoView.findFirst({
      where: {
        photoId: id,
        ip,
        createdAt: {
          gte: tenMinutesAgo,
        },
      },
      select: { id: true },
    });

    if (!recentView) {
      await prisma.photoView.create({
        data: {
          photoId: id,
          ip,
          country: countryName,
          countryCode,
          userAgent: userAgent ? userAgent.slice(0, 255) : null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error recording photo view:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
