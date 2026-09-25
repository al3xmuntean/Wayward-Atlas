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
      return NextResponse.json({ error: "Fotografia nu a fost găsită" }, { status: 404 });
    }

    // 1. Strict Role Authorization
    const photoRequiredRole = photo.minRole || (photo.isPrivate ? "ADMIN" : "PUBLIC");
    const photoRequiredRank = ROLE_RANK[photoRequiredRole] ?? 0;

    if (userRank < photoRequiredRank) {
      return NextResponse.json(
        { error: "Nu ai permisiuni pentru a descărca această fotografie" },
        { status: 403 }
      );
    }

    // 2. People Privacy: Photos containing people strictly require CLOSE_FRIEND or higher
    if (photo.hasPeople && userRank < (ROLE_RANK.CLOSE_FRIEND ?? 2)) {
      return NextResponse.json(
        { error: "Fotografiile cu persoane sunt accesibile doar prietenilor apropiați" },
        { status: 403 }
      );
    }

    // 3. Trip Visibility check
    if (photo.trip.isPrivate && userRank < (ROLE_RANK.VIEWER ?? 1)) {
      return NextResponse.json(
        { error: "Călătoria asociată este privată" },
        { status: 403 }
      );
    }

    // 4. Remote URL Handling (e.g. Unsplash or Cloud Storage)
    const targetUrl = photo.originalUrl || photo.url;
    if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
      return NextResponse.redirect(new URL(targetUrl), 302);
    }

    // 5. Local File Streaming with strict Path Traversal Containment
    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    const filename = path.basename(targetUrl);
    const resolvedPath = path.resolve(uploadsDir, filename);

    if (!resolvedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: "Cale invalidă de descărcare" }, { status: 400 });
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.readFile(resolvedPath);
    } catch {
      // Fallback: If original was deleted or missing, try display url
      if (photo.url && photo.url !== targetUrl) {
        const fallbackFilename = path.basename(photo.url);
        const fallbackPath = path.resolve(uploadsDir, fallbackFilename);
        if (fallbackPath.startsWith(uploadsDir)) {
          fileBuffer = await fs.readFile(fallbackPath);
        } else {
          return NextResponse.json({ error: "Fișierul nu a putut fi găsit" }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: "Fișierul nu a putut fi găsit" }, { status: 404 });
      }
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
        ? "image/webp"
        : ext === ".heic"
        ? "image/heic"
        : ext === ".avif"
        ? "image/avif"
        : "image/jpeg";

    const cleanSpotName = (photo.spotName || photo.placeName || photo.trip.title || "wayward-photo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    const downloadFilename = `${cleanSpotName}-${photo.id.substring(0, 8)}${ext || ".jpg"}`;

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${downloadFilename}"`,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Photo download error:", error);
    return NextResponse.json({ error: "Eroare internă de server" }, { status: 500 });
  }
}
