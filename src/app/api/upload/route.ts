import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Doar administratorul poate încărca fișiere" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Niciun fișier selectat" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const fileId = crypto.randomUUID();
    const originalFilename = `${fileId}-full.webp`;
    const thumbFilename = `${fileId}-thumb.webp`;

    const originalPath = path.join(uploadDir, originalFilename);
    const thumbPath = path.join(uploadDir, thumbFilename);

    // Save optimized full image
    await sharp(buffer)
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(originalPath);

    // Save thumbnail
    await sharp(buffer)
      .resize(400, 400, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(thumbPath);

    return NextResponse.json({
      url: `/uploads/${originalFilename}`,
      thumbnailUrl: `/uploads/${thumbFilename}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Eroare la procesarea fișierului" }, { status: 500 });
  }
}
