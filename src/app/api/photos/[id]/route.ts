import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { UserRole, VisibilityRole } from "@/lib/types";

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

    const photo = await prisma.photo.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            allowedUsers: true,
          },
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const userRank = ROLE_RANK[userRole] ?? 0;
    const photoRequiredRole = photo.minRole || (photo.isPrivate ? "ADMIN" : "PUBLIC");
    const photoRequiredRank = ROLE_RANK[photoRequiredRole] ?? 0;

    const tripRequiredRole = photo.trip.minRole || (photo.trip.isPrivate ? "ADMIN" : "PUBLIC");
    const tripRequiredRank = ROLE_RANK[tripRequiredRole] ?? 0;

    // Both photo and trip access must be satisfied
    const hasTripAccess =
      userRole === "ADMIN" ||
      Boolean(user?.canViewPrivate) ||
      photo.trip.createdById === user?.id ||
      photo.trip.allowedUsers?.some((au) => au.userId === user?.id) ||
      (userRank >= tripRequiredRank && (!photo.trip.isPrivate || userRole !== "PUBLIC"));

    const hasPhotoAccess =
      userRole === "ADMIN" ||
      Boolean(user?.canViewPrivate) ||
      (hasTripAccess &&
        (userRole === "PUBLIC"
          ? !photo.isPrivate && !photo.hasPeople && (!photo.minRole || photo.minRole === "PUBLIC" || photo.minRole === "VIEWER")
          : userRank >= photoRequiredRank));

    if (!hasPhotoAccess) {
      if (!user) {
        return NextResponse.json(
          {
            error: "Authentication required to view this photo",
            code: "AUTH_REQUIRED",
            requiredRole: photoRequiredRole,
            photoTitle: photo.placeName || photo.city || "Expedition Photo",
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        {
          error: "Insufficient permissions to view this private photo",
          code: "FORBIDDEN",
          userRole,
          requiredRole: photoRequiredRole,
          photoTitle: photo.placeName || photo.city || "Expedition Photo",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      photo: {
        id: photo.id,
        tripId: photo.tripId,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        latitude: photo.latitude,
        longitude: photo.longitude,
        placeName: photo.placeName,
        country: photo.country,
        city: photo.city,
        takenAt: photo.takenAt.toISOString(),
        takenYear: new Date(photo.takenAt).getFullYear(),
        hasPeople: photo.hasPeople,
        isPrivate: photo.isPrivate,
        minRole: photo.minRole as VisibilityRole,
        isCountryCover: photo.isCountryCover,
        partnerPreselected: photo.partnerPreselected,
        tags: photo.tags ? (typeof photo.tags === "string" ? JSON.parse(photo.tags) : photo.tags) : [],
      },
      tripId: photo.tripId,
    });
  } catch (error) {
    console.error("GET photo by ID error:", error);
    return NextResponse.json({ error: "Failed to retrieve photo" }, { status: 500 });
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
      minRole,
      hasPeople,
      isPrivate,
      isCountryCover,
      partnerPreselected,
      latitude,
      longitude,
      placeName,
      city,
      country,
    } = body;

    const existingPhoto = await prisma.photo.findUnique({
      where: { id },
    });

    if (!existingPhoto) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (minRole !== undefined) {
      if (!VALID_ROLES.has(minRole)) {
        return NextResponse.json({ error: `Invalid minRole: ${minRole}` }, { status: 400 });
      }
      updateData.minRole = minRole;
    }

    if (hasPeople !== undefined) updateData.hasPeople = Boolean(hasPeople);
    if (isPrivate !== undefined) updateData.isPrivate = Boolean(isPrivate);
    if (partnerPreselected !== undefined) updateData.partnerPreselected = Boolean(partnerPreselected);

    if (latitude !== undefined) {
      const latNum = Number(latitude);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        return NextResponse.json({ error: "Latitude must be a valid number between -90 and 90" }, { status: 400 });
      }
      updateData.latitude = latNum;
    }

    if (longitude !== undefined) {
      const lonNum = Number(longitude);
      if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
        return NextResponse.json({ error: "Longitude must be a valid number between -180 and 180" }, { status: 400 });
      }
      updateData.longitude = lonNum;
    }

    if (placeName !== undefined) {
      updateData.placeName = typeof placeName === "string" ? placeName.trim().slice(0, 300) : null;
    }
    if (city !== undefined) {
      updateData.city = typeof city === "string" ? city.trim().slice(0, 150) : null;
    }
    if (country !== undefined) {
      updateData.country = typeof country === "string" ? country.trim().slice(0, 150) : null;
    }

    // If setting as country cover photo, unset other photos for the same country to maintain a single showcase image
    if (isCountryCover !== undefined) {
      updateData.isCountryCover = Boolean(isCountryCover);
      if (isCountryCover && existingPhoto.country) {
        await prisma.photo.updateMany({
          where: {
            country: existingPhoto.country,
            id: { not: id },
          },
          data: {
            isCountryCover: false,
          },
        });
      }
    }

    const updatedPhoto = await prisma.photo.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, photo: updatedPhoto });
  } catch (error) {
    console.error("Update photo error:", error);
    return NextResponse.json({ error: "Failed to update photo" }, { status: 500 });
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
    await prisma.photo.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete photo error:", error);
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 });
  }
}
