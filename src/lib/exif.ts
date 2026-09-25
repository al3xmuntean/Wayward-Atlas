import exifr from "exifr";

export interface ExtractedPhotoMetadata {
  latitude: number | null;
  longitude: number | null;
  takenAt: string; // ISO string
  altitude?: number | null;
  orientation?: number;
}

/**
 * Robust EXIF extraction for photos (JPEG, HEIC, TIFF, WebP).
 * Accurately extracts GPS coordinates (decimal degrees) and timestamps.
 */
export async function extractPhotoMetadata(
  input: File | Blob | string
): Promise<ExtractedPhotoMetadata> {
  let latitude: number | null = null;
  let longitude: number | null = null;
  let altitude: number | null = null;
  let takenAt = new Date().toISOString();
  let orientation: number | undefined;

  try {
    // 1. Direct GPS extraction via exifr.gps() which converts DMS rational arrays into decimal degrees
    const gps = await exifr.gps(input);
    if (
      gps &&
      typeof gps.latitude === "number" &&
      !isNaN(gps.latitude) &&
      typeof gps.longitude === "number" &&
      !isNaN(gps.longitude)
    ) {
      latitude = gps.latitude;
      longitude = gps.longitude;
    }
  } catch (gpsErr) {
    console.warn("exifr.gps error:", gpsErr);
  }

  try {
    // 2. Extract dates, orientation, and fallback GPS if needed
    const parsed = await exifr.parse(input, {
      pick: [
        "DateTimeOriginal",
        "CreateDate",
        "ModifyDate",
        "Orientation",
        "GPSAltitude",
        "GPSLatitude",
        "GPSLatitudeRef",
        "GPSLongitude",
        "GPSLongitudeRef",
      ],
    });

    if (parsed) {
      // Date extraction
      const rawDate = parsed.DateTimeOriginal || parsed.CreateDate || parsed.ModifyDate;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          takenAt = d.toISOString();
        }
      }

      if (parsed.Orientation) {
        orientation = parsed.Orientation;
      }

      if (typeof parsed.GPSAltitude === "number") {
        altitude = parsed.GPSAltitude;
      }

      // Fallback: If exifr.gps failed but raw GPS coords exist
      if (latitude === null && parsed.GPSLatitude && parsed.GPSLongitude) {
        try {
          const latDMS = parsed.GPSLatitude;
          const lonDMS = parsed.GPSLongitude;
          const latRef = parsed.GPSLatitudeRef || "N";
          const lonRef = parsed.GPSLongitudeRef || "E";

          if (Array.isArray(latDMS) && latDMS.length >= 3) {
            let lat = latDMS[0] + latDMS[1] / 60 + latDMS[2] / 3600;
            if (latRef === "S" || latRef === "s") lat = -lat;
            latitude = lat;
          }

          if (Array.isArray(lonDMS) && lonDMS.length >= 3) {
            let lon = lonDMS[0] + lonDMS[1] / 60 + lonDMS[2] / 3600;
            if (lonRef === "W" || lonRef === "w") lon = -lon;
            longitude = lon;
          }
        } catch (fallbackErr) {
          console.warn("GPS DMS fallback parse error:", fallbackErr);
        }
      }
    }
  } catch (parseErr) {
    console.warn("exifr.parse error:", parseErr);
  }

  return {
    latitude,
    longitude,
    takenAt,
    altitude,
    orientation,
  };
}
