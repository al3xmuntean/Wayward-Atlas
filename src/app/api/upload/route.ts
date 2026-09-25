import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".avif": "image/avif",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".bmp": "image/bmp",
};

const MIME_TO_SAFE_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/pjpeg": ".jpg",
  "image/png": ".png",
  "image/x-png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/avif": ".avif",
  "image/tiff": ".tiff",
  "image/bmp": ".bmp",
};

const MAX_FILE_SIZE = 75 * 1024 * 1024; // 75 Megabytes for high-res camera originals
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/x-png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/tiff",
  "image/bmp",
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
      return NextResponse.json({ error: "Nu a fost furnizată nicio imagine pentru încărcare." }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const results = [];
    const errors: string[] = [];

    for (const file of filesToProcess) {
      if (!file || !file.name) continue;

      if (file.size > MAX_FILE_SIZE) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        console.warn(`[Upload] File ${file.name} too large: ${sizeMb}MB > 75MB`);
        errors.push(`${file.name}: Fișierul depășește 75MB (${sizeMb}MB)`);
        continue;
      }

      let mimeType = file.type?.toLowerCase() || "";
      const ext = path.extname(file.name).toLowerCase();

      // If mimeType is empty or generic octet-stream, infer from file extension
      if ((!mimeType || mimeType === "application/octet-stream") && EXT_TO_MIME[ext]) {
        mimeType = EXT_TO_MIME[ext];
      }

      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        console.warn(`[Upload] File ${file.name} unsupported mime: ${mimeType}, ext: ${ext}`);
        errors.push(`${file.name}: Format neacceptat (${mimeType || ext})`);
        continue;
      }

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const metadata = await sharp(buffer).metadata();
        if (!metadata.width || !metadata.height) {
          console.warn(`[Upload] File ${file.name} metadata missing dimensions`);
          errors.push(`${file.name}: Dimensiuni imagine invalide`);
          continue;
        }

        const fileId = crypto.randomUUID();
        const rawExt = MIME_TO_SAFE_EXT[mimeType] || ext || ".jpg";
        const rawFilename = `${fileId}-raw${rawExt}`;
        const fullWebpFilename = `${fileId}-full.webp`;
        const thumbWebpFilename = `${fileId}-thumb.webp`;

        const rawPath = path.join(uploadDir, rawFilename);
        const fullPath = path.join(uploadDir, fullWebpFilename);
        const thumbPath = path.join(uploadDir, thumbWebpFilename);

        // 1. Save original uncompressed for high-res download
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
      } catch (err: any) {
        console.error("[Upload] Error processing file with sharp:", file.name, err);
        errors.push(`${file.name}: ${err?.message || "Eroare la procesarea imaginii"}`);
      }
    }

    if (results.length === 0) {
      const errMsg = errors.length > 0 ? errors.join("; ") : "Eroare la procesarea fotografiilor încărcate.";
      return NextResponse.json({ error: errMsg, details: errors }, { status: 400 });
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
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Eroare internă de server la încărcare", details: error?.message }, { status: 500 });
  }
}

