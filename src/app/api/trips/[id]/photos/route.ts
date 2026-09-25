import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "PARTNER")) {
      return NextResponse.json(
        { error: "Only administrator or partner can add photos to trips" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { photos } = body;

    if (!Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json({ error: "At least one photo is required" }, { status: 400 });
    }

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const createdPhotos = await prisma.photo.createMany({
      data: photos.map((p: any) => ({
        tripId: id,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl || p.url,
        originalUrl: p.originalUrl || null,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        placeName: p.placeName || null,
        city: p.city || null,
        country: p.country || null,
        spotName: p.spotName || null,
        spotDescription: p.spotDescription || null,
        caption: p.caption || null,
        takenAt: p.takenAt ? new Date(p.takenAt) : new Date(),
        hasPeople: Boolean(p.hasPeople),
        isPrivate: Boolean(p.isPrivate),
        minRole: p.minRole || (p.partnerPreselected ? "PARTNER" : p.hasPeople ? "CLOSE_FRIEND" : "VIEWER"),
        isCountryCover: Boolean(p.isCountryCover),
        partnerPreselected: Boolean(p.partnerPreselected),
        tags: JSON.stringify(p.tags || []),
      })),
    });

    return NextResponse.json({ success: true, count: createdPhotos.count });
  } catch (error) {
    console.error("Add photos to trip error:", error);
    return NextResponse.json({ error: "Failed to add photos to trip" }, { status: 500 });
  }
}
