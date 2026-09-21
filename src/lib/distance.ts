/**
 * Geodesic Distance and Cosmic Scales Engine for Wayward Atlas
 * Home Base: Sibiu, Romania (45.7983° N, 24.1256° E)
 */

import { TripData, PhotoData } from "./types";

// User's home base in Sibiu, Romania
export const HOME_BASE_SIBIU = {
  name: "Sibiu, România",
  latitude: 45.7983,
  longitude: 24.1256,
};

// Earth radius in kilometers
const EARTH_RADIUS_KM = 6371;

// Standard commercial airway transit multiplier (actual flight paths follow airways, not ideal straight lines)
const AIRWAY_TRANSIT_MULTIPLIER = 1.15;

// Astronomical distance constants (in kilometers)
export const COSMIC_SCALES = {
  // Earth's Circumference at the Equator
  EARTH_EQUATOR_KM: 40075,
  // Average Distance to the Moon (Perigee/Apogee mean)
  MOON_DISTANCE_KM: 384400,
  // Average Distance to the Sun (1 Astronomical Unit - AU)
  SUN_DISTANCE_KM: 149597870,
  // Distance to the Closest Star to our Solar System: Proxima Centauri (4.2465 light years)
  PROXIMA_CENTAURI_KM: 40178000000000,
  // Speed of Light in km/s
  SPEED_OF_LIGHT_KM_S: 299792,
};

/**
 * Calculates the great-circle geodesic distance between two GPS coordinates using the Haversine formula
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const toRad = (angle: number) => (angle * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculates the total exploration and transit distance for a single trip starting from Sibiu, Romania
 */
export function calculateTripDistance(
  trip: TripData,
  homeBase: { latitude: number; longitude: number } = HOME_BASE_SIBIU
): {
  transitKm: number;
  explorationKm: number;
  totalKm: number;
} {
  // 1. Calculate intra-trip exploration distance between sequential photos (chronologically ordered)
  let explorationKm = 0;
  const validPhotos = (trip.photos || [])
    .filter((p) => typeof p.latitude === "number" && typeof p.longitude === "number")
    .sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime());

  for (let i = 0; i < validPhotos.length - 1; i++) {
    const p1 = validPhotos[i];
    const p2 = validPhotos[i + 1];
    const dist = haversineDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    // Ignore identical coordinates (same spot)
    if (dist > 0.05) {
      explorationKm += dist;
    }
  }

  // 2. Calculate transit distance from Sibiu to the trip's destination and back
  let destLat = trip.latitude;
  let destLon = trip.longitude;

  if ((destLat === null || destLat === undefined) && validPhotos.length > 0) {
    destLat = validPhotos[0].latitude;
    destLon = validPhotos[0].longitude;
  }

  let transitKm = 0;
  if (typeof destLat === "number" && typeof destLon === "number") {
    const oneWayStraight = haversineDistance(
      homeBase.latitude,
      homeBase.longitude,
      destLat,
      destLon
    );
    // Round trip with standard commercial airway routing factor
    transitKm = oneWayStraight * 2 * AIRWAY_TRANSIT_MULTIPLIER;
  }

  return {
    transitKm: Math.round(transitKm),
    explorationKm: Math.round(explorationKm),
    totalKm: Math.round(transitKm + explorationKm),
  };
}

export interface TravelCosmicMetrics {
  totalKm: number;
  totalTransitKm: number;
  totalExplorationKm: number;
  tripsCount: number;
  photosCount: number;
  countriesVisited: string[];
  equatorLaps: number;
  moonPercentage: number;
  sunPercentage: number;
  proximaCentauriPercentage: number;
  lightSeconds: number;
  apollo11Comparison: string;
}

/**
 * Calculates aggregated travel metrics and cosmic scale milestones across all accessible trips
 */
export function calculateCosmicTravelMetrics(
  trips: TripData[],
  homeBase: { latitude: number; longitude: number } = HOME_BASE_SIBIU
): TravelCosmicMetrics {
  let totalTransitKm = 0;
  let totalExplorationKm = 0;
  let totalPhotos = 0;
  const countriesSet = new Set<string>();

  // Only consider completed expeditions (or countries showcase for public)
  const evaluatedTrips = (trips || []).filter((t) => t.status !== "PLANNED");

  for (const trip of evaluatedTrips) {
    const { transitKm, explorationKm } = calculateTripDistance(trip, homeBase);
    totalTransitKm += transitKm;
    totalExplorationKm += explorationKm;
    totalPhotos += (trip.photos || []).length;

    (trip.photos || []).forEach((p) => {
      if (p.country) countriesSet.add(p.country.trim());
    });
  }

  const totalKm = totalTransitKm + totalExplorationKm;
  const equatorLaps = parseFloat((totalKm / COSMIC_SCALES.EARTH_EQUATOR_KM).toFixed(2));
  const moonPercentage = parseFloat(((totalKm / COSMIC_SCALES.MOON_DISTANCE_KM) * 100).toFixed(2));
  const sunPercentage = parseFloat(((totalKm / COSMIC_SCALES.SUN_DISTANCE_KM) * 100).toFixed(4));
  const proximaCentauriPercentage = parseFloat(
    ((totalKm / COSMIC_SCALES.PROXIMA_CENTAURI_KM) * 100).toFixed(8)
  );
  const lightSeconds = parseFloat((totalKm / COSMIC_SCALES.SPEED_OF_LIGHT_KM_S).toFixed(3));

  // Apollo 11 took approx 3 days (73 hours) to travel the 384,400 km to lunar orbit
  const apollo11EquivalentHours = Math.round((totalKm / COSMIC_SCALES.MOON_DISTANCE_KM) * 73);

  return {
    totalKm,
    totalTransitKm,
    totalExplorationKm,
    tripsCount: evaluatedTrips.length,
    photosCount: totalPhotos,
    countriesVisited: Array.from(countriesSet),
    equatorLaps,
    moonPercentage,
    sunPercentage,
    proximaCentauriPercentage,
    lightSeconds,
    apollo11Comparison: `${apollo11EquivalentHours} ore de zbor lunar în viteza Apollo 11`,
  };
}

export interface PartnerTravelMetrics {
  sharedKm: number;
  sharedTransitKm: number;
  sharedExplorationKm: number;
  sharedTripsCount: number;
  sharedPhotosCount: number;
  sharedCountries: string[];
  sharedEquatorLaps: number;
  sharedMoonPercentage: number;
  sharedPercentageOfTotal: number;
}

/**
 * Calculates aggregated travel metrics specifically for shared journeys with the partner
 */
export function calculatePartnerTravelMetrics(
  trips: TripData[],
  homeBase: { latitude: number; longitude: number } = HOME_BASE_SIBIU
): PartnerTravelMetrics {
  let sharedTransitKm = 0;
  let sharedExplorationKm = 0;
  let sharedPhotos = 0;
  const countriesSet = new Set<string>();

  const partnerTrips = (trips || []).filter((t) => t.status !== "PLANNED" && t.withPartner);
  const totalMetrics = calculateCosmicTravelMetrics(trips, homeBase);

  for (const trip of partnerTrips) {
    const { transitKm, explorationKm } = calculateTripDistance(trip, homeBase);
    sharedTransitKm += transitKm;
    sharedExplorationKm += explorationKm;
    sharedPhotos += (trip.photos || []).length;

    (trip.photos || []).forEach((p) => {
      if (p.country) countriesSet.add(p.country.trim());
    });
  }

  const sharedKm = sharedTransitKm + sharedExplorationKm;
  const sharedPercentageOfTotal =
    totalMetrics.totalKm > 0 ? Math.round((sharedKm / totalMetrics.totalKm) * 100) : 100;

  const sharedEquatorLaps = parseFloat((sharedKm / COSMIC_SCALES.EARTH_EQUATOR_KM).toFixed(2));
  const sharedMoonPercentage = parseFloat(
    ((sharedKm / COSMIC_SCALES.MOON_DISTANCE_KM) * 100).toFixed(2)
  );

  return {
    sharedKm,
    sharedTransitKm,
    sharedExplorationKm,
    sharedTripsCount: partnerTrips.length,
    sharedPhotosCount: sharedPhotos,
    sharedCountries: Array.from(countriesSet),
    sharedEquatorLaps,
    sharedMoonPercentage,
    sharedPercentageOfTotal,
  };
}

