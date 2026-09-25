import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { TripData, PhotoData, UserRole, VisibilityRole } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const userRole: UserRole | "PUBLIC" = user?.role || "PUBLIC";
    const isAdmin = userRole === "ADMIN";
    const isPartner = userRole === "PARTNER" || isAdmin;
    const isCloseFriend = userRole === "CLOSE_FRIEND" || isPartner;
    const isViewer = userRole === "VIEWER" || isCloseFriend;
    const isPublic = userRole === "PUBLIC";

    // --- 1. PUBLIC GUEST MODE ---
    // Sees real public trips and public spot pins (strictly no people photos, not private, public minRole)
    if (isPublic) {
      const publicTrips = await prisma.trip.findMany({
        where: {
          isPrivate: false,
          minRole: { in: ["PUBLIC", "VIEWER"] },
          status: "COMPLETED",
        },
        include: {
          photos: {
            where: {
              isPrivate: false,
              hasPeople: false,
              minRole: "PUBLIC",
            },
            orderBy: { takenAt: "asc" },
          },
        },
        orderBy: { startDate: "desc" },
      });

      const formattedTrips: TripData[] = publicTrips
        .filter((trip) => trip.photos.length > 0)
        .map((trip) => {
          const tripYear = new Date(trip.startDate).getFullYear();
          const formattedPhotos: PhotoData[] = trip.photos.map((photo) => {
            let tags: string[] = [];
            try {
              tags = JSON.parse(photo.tags);
            } catch {
              tags = [];
            }
            return {
              id: photo.id,
              tripId: photo.tripId,
              url: photo.url,
              thumbnailUrl: photo.thumbnailUrl || photo.url,
              latitude: photo.latitude,
              longitude: photo.longitude,
              placeName: photo.placeName,
              country: photo.country,
              city: photo.city,
              spotName: photo.spotName,
              spotDescription: photo.spotDescription,
              caption: photo.caption,
              originalUrl: null,
              takenAt: `${tripYear}-01-01T00:00:00.000Z`,
              takenYear: tripYear,
              hasPeople: false,
              isPrivate: false,
              minRole: "PUBLIC",
              isCountryCover: photo.isCountryCover,
              partnerPreselected: false,
              tags,
            };
          });

          return {
            id: trip.id,
            title: trip.title,
            description: trip.description,
            startDate: `${tripYear}-01-01T00:00:00.000Z`,
            endDate: null,
            year: tripYear,
            isPrivate: false,
            minRole: "PUBLIC",
            withPartner: false,
            partnerNotes: null,
            createdById: "system",
            photos: formattedPhotos,
            comments: [],
            allowedUserIds: [],
            isMaskedDate: true,
            isCountryShowcase: false,
            translations: trip.translations,
          };
        });

      return NextResponse.json({
        userRole: "PUBLIC",
        trips: formattedTrips,
      });
    }

    // --- 2. AUTHENTICATED ROLES: VIEWER, CLOSE_FRIEND, PARTNER, ADMIN ---
    const tripWhereClause: any = {};
    if (!isAdmin) {
      if (isPartner) {
        // Partner sees public, viewer, close_friend, and partner trips, plus trips shared or with partner
        tripWhereClause.OR = [
          { isPrivate: false },
          { minRole: { in: ["PUBLIC", "VIEWER", "CLOSE_FRIEND", "PARTNER"] } },
          { withPartner: true },
          { allowedUsers: { some: { userId: user!.id } } },
        ];
      } else if (isCloseFriend) {
        // Close friend sees public, viewer, close_friend (COMPLETED only)
        tripWhereClause.AND = [
          { status: "COMPLETED" },
          {
            OR: [
              { isPrivate: false, minRole: { in: ["PUBLIC", "VIEWER", "CLOSE_FRIEND"] } },
              { allowedUsers: { some: { userId: user!.id } } },
            ],
          },
        ];
      } else {
        // Viewer sees public, viewer only (COMPLETED only)
        tripWhereClause.AND = [
          { status: "COMPLETED" },
          {
            OR: [
              { isPrivate: false, minRole: { in: ["PUBLIC", "VIEWER"] } },
              { allowedUsers: { some: { userId: user!.id } } },
            ],
          },
        ];
      }
    }

    const trips = await prisma.trip.findMany({
      where: tripWhereClause,
      include: {
        photos: {
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

      // Role-based Photo Filtering
      const allowedPhotos = trip.photos.filter((p) => {
        if (isAdmin) return true;

        // VIEWER role cannot see photos with people
        if (userRole === "VIEWER" && p.hasPeople) {
          return false;
        }

        // Check photo minRole
        if (p.minRole === "ADMIN" && !isAdmin) return false;
        if (p.minRole === "PARTNER" && !isPartner) return false;
        if (p.minRole === "CLOSE_FRIEND" && !isCloseFriend) return false;

        // Private photo check
        if (p.isPrivate && !isPartner && !isAdmin) return false;

        return true;
      });

      const formattedPhotos: PhotoData[] = allowedPhotos.map((p) => {
        let tags: string[] = [];
        try {
          tags = JSON.parse(p.tags);
        } catch {
          tags = [];
        }

        const photoYear = new Date(p.takenAt).getFullYear();

        return {
          id: p.id,
          tripId: p.tripId,
          url: p.url,
          thumbnailUrl: p.thumbnailUrl || p.url,
          latitude: p.latitude,
          longitude: p.longitude,
          placeName: p.placeName,
          country: p.country,
          city: p.city,
          spotName: p.spotName,
          spotDescription: p.spotDescription,
          caption: p.caption,
          originalUrl: p.originalUrl,
          takenAt: p.takenAt.toISOString(),
          takenYear: photoYear,
          hasPeople: p.hasPeople,
          isPrivate: p.isPrivate,
          minRole: (p.minRole as VisibilityRole) || "VIEWER",
          isCountryCover: p.isCountryCover,
          partnerPreselected: p.partnerPreselected,
          tags,
        };
      });

      // Partner travel notes are strictly reserved for PARTNER and ADMIN
      const partnerNotes = (isPartner || isAdmin) ? trip.partnerNotes : null;

      let planData = null;
      if (trip.planData && (isPartner || isAdmin)) {
        try {
          planData = JSON.parse(trip.planData);
        } catch {}
      }

      let achievementReport = null;
      if (trip.achievementReport && (isPartner || isAdmin)) {
        try {
          achievementReport = JSON.parse(trip.achievementReport);
        } catch {}
      }

      return {
        id: trip.id,
        title: trip.title,
        description: trip.description,
        startDate: trip.startDate.toISOString(),
        endDate: trip.endDate ? trip.endDate.toISOString() : null,
        year,
        isPrivate: trip.isPrivate,
        minRole: (trip.minRole as VisibilityRole) || "VIEWER",
        status: (trip.status as "PLANNED" | "COMPLETED") || "COMPLETED",
        latitude: trip.latitude,
        longitude: trip.longitude,
        planData,
        achievementReport,
        withPartner: (isPartner || isAdmin) ? trip.withPartner : false,
        partnerNotes,
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
        isMaskedDate: false,
        isCountryShowcase: false,
        translations: trip.translations,
      };
    });

    return NextResponse.json({
      userRole,
      trips: formattedTrips,
    });
  } catch (error) {
    console.error("Fetch trips error:", error);
    return NextResponse.json({ error: "Failed to retrieve trips" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "PARTNER")) {
      return NextResponse.json({ error: "Only administrator or partner can create trips" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      startDate,
      endDate,
      isPrivate,
      minRole,
      status = "COMPLETED",
      latitude,
      longitude,
      planData,
      withPartner,
      partnerNotes,
      photos = [],
      allowedUserIds,
      translations,
    } = body;

    const isPlanned = status === "PLANNED";

    if (!title || !startDate) {
      return NextResponse.json({ error: "Title and start date are required" }, { status: 400 });
    }

    if (!isPlanned && (!Array.isArray(photos) || photos.length === 0)) {
      return NextResponse.json({ error: "At least one photo is required for a completed trip" }, { status: 400 });
    }

    const newTrip = await prisma.trip.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isPrivate: Boolean(isPrivate),
        minRole: isPlanned ? "PARTNER" : (minRole || (withPartner ? "PARTNER" : "VIEWER")),
        status: isPlanned ? "PLANNED" : "COMPLETED",
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        planData: planData ? (typeof planData === "string" ? planData : JSON.stringify(planData)) : null,
        withPartner: isPlanned ? true : Boolean(withPartner),
        partnerNotes: partnerNotes || null,
        translations: typeof translations === "string" ? translations : translations ? JSON.stringify(translations) : null,
        createdById: user.id,
        allowedUsers: {
          create: (allowedUserIds || []).map((uid: string) => ({
            userId: uid,
          })),
        },
        photos: {
          create: (photos || []).map((p: any) => ({
            url: p.url,
            thumbnailUrl: p.thumbnailUrl || p.url,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            placeName: p.placeName || null,
            city: p.city || null,
            country: p.country || null,
            spotName: p.spotName || null,
            spotDescription: p.spotDescription || null,
            caption: p.caption || null,
            originalUrl: p.originalUrl || null,
            takenAt: p.takenAt ? new Date(p.takenAt) : new Date(startDate),
            hasPeople: Boolean(p.hasPeople),
            isPrivate: Boolean(p.isPrivate),
            minRole: p.minRole || (p.partnerPreselected ? "PARTNER" : p.hasPeople ? "CLOSE_FRIEND" : "VIEWER"),
            isCountryCover: Boolean(p.isCountryCover),
            partnerPreselected: Boolean(p.partnerPreselected),
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
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}
