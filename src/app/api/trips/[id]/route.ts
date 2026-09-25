import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { TripData, UserRole, VisibilityRole } from "@/lib/types";

const VALID_ROLES = new Set(["PUBLIC", "VIEWER", "CLOSE_FRIEND", "PARTNER", "ADMIN"]);

const ROLE_RANK: Record<string, number> = {
  PUBLIC: 0,
  VIEWER: 1,
  CLOSE_FRIEND: 2,
  PARTNER: 3,
  ADMIN: 4,
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const userRole: UserRole | "PUBLIC" = user?.role || "PUBLIC";

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        photos: {
          orderBy: { takenAt: "asc" },
        },
        allowedUsers: true,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const userRank = ROLE_RANK[userRole] ?? 0;
    const tripRequiredRole = trip.minRole || (trip.isPrivate ? "ADMIN" : "PUBLIC");
    const tripRequiredRank = ROLE_RANK[tripRequiredRole] ?? 0;

    const hasAccess =
      userRole === "ADMIN" ||
      Boolean(user?.canViewPrivate) ||
      trip.createdById === user?.id ||
      trip.allowedUsers?.some((au) => au.userId === user?.id) ||
      (userRank >= tripRequiredRank && (!trip.isPrivate || userRole !== "PUBLIC"));

    if (!hasAccess) {
      if (!user) {
        return NextResponse.json(
          {
            error: "Authentication required to view this trip",
            code: "AUTH_REQUIRED",
            requiredRole: tripRequiredRole,
            tripTitle: trip.title,
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        {
          error: "Insufficient permissions to view this private trip",
          code: "FORBIDDEN",
          userRole,
          requiredRole: tripRequiredRole,
          tripTitle: trip.title,
        },
        { status: 403 }
      );
    }

    // Filter photos based on viewer rank
    const filteredPhotos = trip.photos.filter((photo) => {
      if (userRole === "ADMIN" || user?.canViewPrivate) return true;
      if (userRole === "PUBLIC") {
        return !photo.isPrivate && !photo.hasPeople && (!photo.minRole || photo.minRole === "PUBLIC" || photo.minRole === "VIEWER");
      }
      const photoRequiredRole = photo.minRole || (photo.isPrivate ? "ADMIN" : "PUBLIC");
      const photoRequiredRank = ROLE_RANK[photoRequiredRole] ?? 0;
      return userRank >= photoRequiredRank;
    });

    let planData = null;
    if (trip.planData) {
      try {
        planData = typeof trip.planData === "string" ? JSON.parse(trip.planData) : trip.planData;
      } catch {}
    }

    const formattedTrip: TripData = {
      id: trip.id,
      title: trip.title,
      description: trip.description,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate ? trip.endDate.toISOString() : null,
      year: new Date(trip.startDate).getFullYear(),
      isPrivate: trip.isPrivate,
      minRole: trip.minRole as VisibilityRole,
      status: trip.status as any,
      withPartner: trip.withPartner,
      partnerNotes: userRole === "PARTNER" || userRole === "ADMIN" ? trip.partnerNotes : null,
      latitude: trip.latitude,
      longitude: trip.longitude,
      planData,
      photos: filteredPhotos.map((p) => ({
        id: p.id,
        tripId: p.tripId,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl,
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
        takenYear: new Date(p.takenAt).getFullYear(),
        hasPeople: p.hasPeople,
        isPrivate: p.isPrivate,
        minRole: p.minRole as VisibilityRole,
        isCountryCover: p.isCountryCover,
        partnerPreselected: p.partnerPreselected,
        tags: p.tags ? (typeof p.tags === "string" ? JSON.parse(p.tags) : p.tags) : [],
      })),
      createdById: trip.createdById,
      comments: [],
      allowedUserIds: trip.allowedUsers.map((au) => au.userId),
      translations: trip.translations,
    };

    return NextResponse.json({ trip: formattedTrip });
  } catch (error) {
    console.error("GET trip by ID error:", error);
    return NextResponse.json({ error: "Failed to retrieve trip" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const {
      title,
      description,
      startDate,
      endDate,
      isPrivate,
      minRole,
      withPartner,
      partnerNotes,
      translations,
      latitude,
      longitude,
    } = body;

    const updateData: any = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
      }
      if (title.length > 200) {
        return NextResponse.json({ error: "Title exceeds 200 characters limit" }, { status: 400 });
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      if (typeof description === "string" && description.length > 5000) {
        return NextResponse.json({ error: "Description exceeds 5000 characters limit" }, { status: 400 });
      }
      updateData.description = typeof description === "string" ? description.trim() : null;
    }

    if (startDate !== undefined) {
      const parsedDate = new Date(startDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: "Invalid startDate format" }, { status: 400 });
      }
      updateData.startDate = parsedDate;
    }

    if (endDate !== undefined) {
      if (endDate) {
        const parsedEndDate = new Date(endDate);
        if (isNaN(parsedEndDate.getTime())) {
          return NextResponse.json({ error: "Invalid endDate format" }, { status: 400 });
        }
        updateData.endDate = parsedEndDate;
      } else {
        updateData.endDate = null;
      }
    }

    if (isPrivate !== undefined) updateData.isPrivate = Boolean(isPrivate);

    if (minRole !== undefined) {
      if (!VALID_ROLES.has(minRole)) {
        return NextResponse.json({ error: `Invalid minRole. Must be one of: ${Array.from(VALID_ROLES).join(", ")}` }, { status: 400 });
      }
      updateData.minRole = minRole;
    }

    if (withPartner !== undefined) updateData.withPartner = Boolean(withPartner);

    if (partnerNotes !== undefined) {
      if (typeof partnerNotes === "string" && partnerNotes.length > 5000) {
        return NextResponse.json({ error: "Partner notes exceed 5000 characters limit" }, { status: 400 });
      }
      updateData.partnerNotes = typeof partnerNotes === "string" ? partnerNotes.trim() : null;
    }

    if (latitude !== undefined) updateData.latitude = latitude !== null ? Number(latitude) : null;
    if (longitude !== undefined) updateData.longitude = longitude !== null ? Number(longitude) : null;

    if (translations !== undefined) {
      updateData.translations = typeof translations === "string" ? translations : translations ? JSON.stringify(translations) : null;
    }

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: updateData,
    });

    // 1. Delete removed photos if specified
    if (Array.isArray(body.deletedPhotoIds) && body.deletedPhotoIds.length > 0) {
      await prisma.photo.deleteMany({
        where: {
          id: { in: body.deletedPhotoIds },
          tripId: id,
        },
      });
    }

    // 2. Update existing photos (spots, roles, coords)
    if (Array.isArray(body.updatedPhotos) && body.updatedPhotos.length > 0) {
      for (const up of body.updatedPhotos) {
        if (!up.id) continue;
        await prisma.photo.update({
          where: { id: up.id },
          data: {
            ...(up.spotName !== undefined && { spotName: up.spotName }),
            ...(up.spotDescription !== undefined && { spotDescription: up.spotDescription }),
            ...(up.latitude !== undefined && { latitude: Number(up.latitude) }),
            ...(up.longitude !== undefined && { longitude: Number(up.longitude) }),
            ...(up.minRole !== undefined && { minRole: up.minRole }),
            ...(up.isPrivate !== undefined && { isPrivate: Boolean(up.isPrivate) }),
            ...(up.hasPeople !== undefined && { hasPeople: Boolean(up.hasPeople) }),
            ...(up.caption !== undefined && { caption: up.caption }),
          },
        });
      }
    }

    // 3. Insert newly uploaded photos if specified
    if (Array.isArray(body.newPhotos) && body.newPhotos.length > 0) {
      await prisma.photo.createMany({
        data: body.newPhotos.map((p: any) => ({
          tripId: id,
          url: p.url,
          thumbnailUrl: p.thumbnailUrl || p.url,
          latitude: Number(p.latitude) || 0,
          longitude: Number(p.longitude) || 0,
          placeName: p.placeName || null,
          city: p.city || null,
          country: p.country || null,
          spotName: p.spotName || null,
          spotDescription: p.spotDescription || null,
          caption: p.caption || null,
          originalUrl: p.originalUrl || null,
          takenAt: p.takenAt ? new Date(p.takenAt) : new Date(),
          hasPeople: Boolean(p.hasPeople),
          isPrivate: Boolean(p.isPrivate),
          minRole: p.minRole || "VIEWER",
          isCountryCover: Boolean(p.isCountryCover),
          partnerPreselected: Boolean(p.partnerPreselected),
          tags: JSON.stringify(p.tags || []),
        })),
      });
    }

    // Fetch refreshed trip with all updated photos
    const refreshedTrip = await prisma.trip.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { takenAt: "asc" } },
      },
    });

    return NextResponse.json({ success: true, trip: refreshedTrip || updatedTrip });
  } catch (error) {
    console.error("Update trip error:", error);
    return NextResponse.json({ error: "Failed to update trip information" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    await prisma.trip.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete trip error:", error);
    return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 });
  }
}
