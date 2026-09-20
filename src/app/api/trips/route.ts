import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { TripData, PhotoData } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const isGuest = !user;
    const isAdmin = user?.role === "ADMIN";
    const canSeeAllPrivate = isAdmin || Boolean(user?.canViewPrivate);

    // Query trips accessible to current user
    const trips = await prisma.trip.findMany({
      where: canSeeAllPrivate
        ? {}
        : user
        ? {
            OR: [
              { isPrivate: false },
              { createdById: user.id },
              { allowedUsers: { some: { userId: user.id } } },
            ],
          }
        : {
            isPrivate: false,
          },
      include: {
        photos: {
          where: canSeeAllPrivate
            ? {}
            : {
                isPrivate: false,
              },
          orderBy: { takenAt: "asc" },
        },
        comments: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        allowedUsers: { select: { userId: true } },
      },
      orderBy: { startDate: "desc" },
    });

    const formattedTrips: TripData[] = trips.map((trip) => {
      const year = new Date(trip.startDate).getFullYear();

      // Mask date for guests: only expose year
      let formattedStartDate = trip.startDate.toISOString();
      let formattedEndDate = trip.endDate ? trip.endDate.toISOString() : null;
      if (isGuest) {
        formattedStartDate = `${year}-01-01T00:00:00.000Z`;
        formattedEndDate = null;
      }

      const formattedPhotos: PhotoData[] = trip.photos.map((p) => {
        let tags: string[] = [];
        try {
          tags = JSON.parse(p.tags);
        } catch {
          tags = [];
        }

        const photoYear = new Date(p.takenAt).getFullYear();
        let takenAtString = p.takenAt.toISOString();
        if (isGuest) {
          takenAtString = `${photoYear}-01-01T00:00:00.000Z`;
        }

        return {
          id: p.id,
          tripId: p.tripId,
          url: p.url,
          thumbnailUrl: p.thumbnailUrl,
          latitude: p.latitude,
          longitude: p.longitude,
          placeName: p.placeName,
          country: p.country,
          city: p.city,
          takenAt: takenAtString,
          takenYear: photoYear,
          hasPeople: p.hasPeople,
          isPrivate: p.isPrivate,
          tags,
        };
      });

      return {
        id: trip.id,
        title: trip.title,
        description: trip.description,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        year,
        isPrivate: trip.isPrivate,
        createdById: trip.createdById,
        photos: formattedPhotos,
        comments: trip.comments.map((c) => ({
          id: c.id,
          tripId: c.tripId,
          userId: c.userId,
          userName: c.user.name,
          content: c.content,
          createdAt: c.createdAt.toISOString(),
        })),
        allowedUserIds: trip.allowedUsers.map((a) => a.userId),
        isMaskedDate: isGuest,
      };
    });

    return NextResponse.json({ trips: formattedTrips });
  } catch (error) {
    console.error("Fetch trips error:", error);
    return NextResponse.json({ error: "Eroare la preluarea călătoriilor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Doar administratorul poate adăuga călătorii" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, startDate, endDate, isPrivate, photos, allowedUserIds } = body;

    if (!title || !startDate || !photos || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json({ error: "Titlul, data și cel puțin o poză sunt obligatorii" }, { status: 400 });
    }

    const newTrip = await prisma.trip.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isPrivate: Boolean(isPrivate),
        createdById: user.id,
        allowedUsers: {
          create: (allowedUserIds || []).map((uid: string) => ({
            userId: uid,
          })),
        },
        photos: {
          create: photos.map((p: any) => ({
            url: p.url,
            thumbnailUrl: p.thumbnailUrl || p.url,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            placeName: p.placeName || null,
            city: p.city || null,
            country: p.country || null,
            takenAt: p.takenAt ? new Date(p.takenAt) : new Date(startDate),
            hasPeople: Boolean(p.hasPeople),
            isPrivate: Boolean(p.isPrivate),
            tags: JSON.stringify(p.tags || []),
          })),
        },
      },
      include: {
        photos: true,
        comments: true,
      },
    });

    return NextResponse.json({ success: true, trip: newTrip });
  } catch (error) {
    console.error("Create trip error:", error);
    return NextResponse.json({ error: "Eroare la salvarea călătoriei" }, { status: 500 });
  }
}
