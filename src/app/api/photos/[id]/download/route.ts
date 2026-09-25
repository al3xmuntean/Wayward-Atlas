import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

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
    const userRole = user?.role || "PUBLIC";
    const userRank = ROLE_RANK[userRole] ?? 0;

    const photo = await prisma.photo.findUnique({
      where: { id },
      include: { trip: true },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Role check
    const photoRequiredRole = photo.minRole || (photo.isPrivate ? "ADMIN" : "PUBLIC");
    const photoRequiredRank = ROLE_RANK[photoRequiredRole] ?? 0;

    if (userRank < photoRequiredRank) {
      return NextResponse.json({ error: "Unauthorized to download this photo" }, { status: 403 });
    }

    // Determine target file to stream
    const targetRelUrl = photo.originalUrl || photo.url;
    // targetRelUrl is e.g. /uploads/<filename>
    const filename = path.basename(targetRelUrl);
    const filePath = path.join(process.cwd(), "public", "uploads", filename);

    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
        ? "image/webp"
        : "image/jpeg";

    const downloadFilename = `${(photo.spotName || photo.placeName || "wayward-photo").replace(/[^a-zA-Z0-9_-]/g, "_")}${ext}`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${downloadFilename}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Photo download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
