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
    // 1. Rate limiting check (max 20 uploads / minute per IP)
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit("upload", clientIp, 20, 60000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Upload rate limit exceeded. Please retry in ${rateLimit.resetInSeconds} seconds.` },
        { status: 429 }
      );
    }

    // 2. Strict Administrator Authentication & Authorization
    const { user, errorResponse } = await requireAdmin();
    if (errorResponse) {
      return errorResponse;
    }

    // 3. Form Data and File Extraction
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 4. File Size Cap Validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds the 20MB limit (size: ${(file.size / (1024 * 1024)).toFixed(1)}MB)` },
        { status: 413 }
      );
    }

    // 5. MIME Type Validation
    const mimeType = file.type?.toLowerCase() || "";
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported image format: ${mimeType || "unknown"}. Allowed: JPEG, PNG, WebP, HEIC, AVIF.` },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 6. Deep Image Validation with Sharp (rejects malicious corrupted binaries masquerading as images)
    try {
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height) {
        return NextResponse.json({ error: "Corrupted or invalid image data" }, { status: 400 });
      }
    } catch (imageErr) {
      console.error("Invalid image buffer:", imageErr);
      return NextResponse.json({ error: "Unable to decode image. File is corrupt or not a valid image." }, { status: 400 });
    }

    // 7. Secure File Storage with randomized UUID names (directory traversal immune)
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
      success: true,
      url: `/uploads/${originalFilename}`,
      thumbnailUrl: `/uploads/${thumbFilename}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error processing upload" }, { status: 500 });
  }
}
