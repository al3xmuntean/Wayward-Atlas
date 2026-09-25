import { PhotoData, SpotPinData, TripData, SafeUser } from "./types";

/**
 * Calculates distance in meters between two lat/long points using the Haversine formula
 */
export function calculateMetersDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Groups a collection of photos into distinct physical spots / POIs
 * based on spatial proximity (default: 80 meters) and spot naming.
 */
export function groupPhotosIntoSpots(
  photos: PhotoData[],
  trips: TripData[] = [],
  thresholdMeters = 80
): SpotPinData[] {
  const spots: SpotPinData[] = [];

  for (const photo of photos) {
    if (
      photo.latitude === undefined ||
      photo.longitude === undefined ||
      photo.latitude === null ||
      photo.longitude === null ||
      (photo.latitude === 0 && photo.longitude === 0)
    ) {
      continue;
    }

    // Try to find an existing spot within thresholdMeters or matching spotName in same city
    const matchedSpot = spots.find((spot) => {
      // If both have explicit matching spotNames in the same city/country
      if (
        photo.spotName &&
        spot.name &&
        photo.spotName.trim().toLowerCase() === spot.name.trim().toLowerCase() &&
        photo.city?.toLowerCase() === spot.city?.toLowerCase()
      ) {
        return true;
      }

      // Geospatial distance check
      const dist = calculateMetersDistance(
        photo.latitude,
        photo.longitude,
        spot.latitude,
        spot.longitude
      );
      return dist <= thresholdMeters;
    });

    if (matchedSpot) {
      matchedSpot.photos.push(photo);
      matchedSpot.totalPhotosCount = matchedSpot.photos.length;
      if (!matchedSpot.tripIds.includes(photo.tripId)) {
        matchedSpot.tripIds.push(photo.tripId);
      }
      if (photo.minRole === "PARTNER" || photo.partnerPreselected) {
        matchedSpot.hasPartnerPhotos = true;
      }
      if (photo.minRole === "CLOSE_FRIEND" || photo.hasPeople) {
        matchedSpot.hasFriendsPhotos = true;
      }
      if (!photo.isPrivate && (photo.minRole === "PUBLIC" || !photo.minRole)) {
        matchedSpot.hasPublicPhotos = true;
      }
    } else {
      const spotName =
        photo.spotName?.trim() ||
        photo.placeName?.trim() ||
        (photo.city ? `${photo.city} Spot` : "Punct de Explorare");

      const newSpot: SpotPinData = {
        id: `spot-${photo.id}-${Math.round(photo.latitude * 10000)}_${Math.round(photo.longitude * 10000)}`,
        latitude: photo.latitude,
        longitude: photo.longitude,
        name: spotName,
        description: photo.spotDescription || null,
        country: photo.country || null,
        city: photo.city || null,
        photos: [photo],
        tripIds: [photo.tripId],
        totalPhotosCount: 1,
        hasPartnerPhotos: photo.minRole === "PARTNER" || Boolean(photo.partnerPreselected),
        hasFriendsPhotos: photo.minRole === "CLOSE_FRIEND" || Boolean(photo.hasPeople),
        hasPublicPhotos: !photo.isPrivate && (photo.minRole === "PUBLIC" || !photo.minRole),
        coverPhoto: photo,
      };

      spots.push(newSpot);
    }
  }

  // Refine each spot's centroid and cover photo
  for (const spot of spots) {
    // Select best cover photo (prefer designated cover, then high-res, then first)
    const cover =
      spot.photos.find((p) => p.isCountryCover) ||
      spot.photos.find((p) => p.thumbnailUrl) ||
      spot.photos[0];
    if (cover) {
      spot.coverPhoto = cover;
    }
  }

  return spots;
}

/**
 * Filter spots and their photos based on active user role
 */
export function filterSpotsByRole(
  spots: SpotPinData[],
  user: SafeUser | null
): SpotPinData[] {
  const role = user?.role || "PUBLIC";

  return spots
    .map((spot) => {
      const visiblePhotos = spot.photos.filter((photo) => {
        // Admin sees all
        if (role === "ADMIN") return true;

        const photoRole = photo.minRole || (photo.isPrivate ? "ADMIN" : "PUBLIC");

        if (role === "PARTNER") {
          return true; // Partner sees partner, close friends, viewer, public
        }
        if (role === "CLOSE_FRIEND") {
          return photoRole === "PUBLIC" || photoRole === "VIEWER" || photoRole === "CLOSE_FRIEND";
        }
        if (role === "VIEWER") {
          return photoRole === "PUBLIC" || photoRole === "VIEWER";
        }
        // Public/unauthenticated: strictly no people, not private, public role
        return !photo.isPrivate && !photo.hasPeople && (photoRole === "PUBLIC" || !photo.minRole);
      });

      if (visiblePhotos.length === 0) return null;

      return {
        ...spot,
        photos: visiblePhotos,
        totalPhotosCount: visiblePhotos.length,
        coverPhoto: visiblePhotos[0] || spot.coverPhoto,
      };
    })
    .filter((s): s is SpotPinData => s !== null);
}

/**
 * Convert spots into GeoJSON FeatureCollection for MapLibre GL
 */
export function spotsToGeoJSON(spots: SpotPinData[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: spots.map((spot) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [spot.longitude, spot.latitude],
      },
      properties: {
        id: spot.id,
        name: spot.name,
        country: spot.country || "",
        city: spot.city || "",
        totalPhotosCount: spot.totalPhotosCount,
        hasPartnerPhotos: spot.hasPartnerPhotos,
        hasFriendsPhotos: spot.hasFriendsPhotos,
        hasPublicPhotos: spot.hasPublicPhotos,
        coverPhotoThumbnail: spot.coverPhoto?.thumbnailUrl || spot.coverPhoto?.url || "",
        coverPhotoId: spot.coverPhoto?.id || "",
        tripId: spot.tripIds[0] || "",
      },
    })),
  };
}
