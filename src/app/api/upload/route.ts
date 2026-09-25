import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 Megabytes
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
]);

export async function POST(req: NextRequest) {
  try {
    // 1. Strict Administrator Authentication & Authorization first
    const { user, errorResponse } = await requireAdmin();
    if (errorResponse) {
      return errorResponse;
    }

    // 2. Generous rate limiting for Admin bulk uploads (600 photos / minute)
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit("upload", clientIp, 600, 60000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Upload rate limit exceeded. Please retry in ${rateLimit.resetInSeconds} seconds.` },
        { status: 429 }
      );
    }

    // 3. Form Data and File Extraction (support both 'files' and 'file')
    const formData = await req.formData();
    const filesList = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File | null;

    const filesToProcess = filesList.length > 0 ? filesList : singleFile ? [singleFile] : [];

    if (filesToProcess.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const results = [];

    for (const file of filesToProcess) {
      if (file.size > MAX_FILE_SIZE) {
        continue;
      }

      const mimeType = file.type?.toLowerCase() || "";
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      try {
        const metadata = await sharp(buffer).metadata();
        if (!metadata.width || !metadata.height) {
          continue;
        }

        const fileId = crypto.randomUUID();
        const rawExt = path.extname(file.name) || ".jpg";
        const rawFilename = `${fileId}-raw${rawExt}`;
        const fullWebpFilename = `${fileId}-full.webp`;
        const thumbWebpFilename = `${fileId}-thumb.webp`;

        const rawPath = path.join(uploadDir, rawFilename);
        const fullPath = path.join(uploadDir, fullWebpFilename);
        const thumbPath = path.join(uploadDir, thumbWebpFilename);

        // 1. Save uncompressed original for full-res download
        await fs.writeFile(rawPath, buffer);

        // 2. Save web-optimized full display WebP (max 1920px)
        await sharp(buffer)
          .rotate() // auto-orient based on EXIF orientation
          .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(fullPath);

        // 3. Save compact thumbnail WebP (400x400 cover)
        await sharp(buffer)
          .rotate()
          .resize(400, 400, { fit: "cover" })
          .webp({ quality: 80 })
          .toFile(thumbPath);

        results.push({
          success: true,
          originalName: file.name,
          url: `/uploads/${fullWebpFilename}`,
          thumbnailUrl: `/uploads/${thumbWebpFilename}`,
          originalUrl: `/uploads/${rawFilename}`,
          width: metadata.width,
          height: metadata.height,
        });
      } catch (err) {
        console.error("Error processing file in upload batch:", file.name, err);
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ error: "Failed to process uploaded files" }, { status: 400 });
    }

    // If single file was passed, return single object for backwards compatibility
    if (results.length === 1 && !filesList.length) {
      return NextResponse.json(results[0]);
    }

    return NextResponse.json({
      success: true,
      uploads: results,
      totalUploaded: results.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error processing upload" }, { status: 500 });
  }
}
