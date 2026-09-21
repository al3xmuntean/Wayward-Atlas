import { TripData } from "./types";

export interface VisitedCountry {
  name: string;
  normalizedName: string;
  isoA2: string;
  isoA3: string;
  flag: string;
  firstVisitDate: string;
  tripsCount: number;
  photosCount: number;
  cities: string[];
  samplePhotoUrl?: string;
}

export interface ExplorationStats {
  totalVisited: number;
  percentageOfWorld: number;
  totalCities: number;
  rankTitle: string;
  rankBadge: string;
}

// Country name normalization dictionary (Romanian & English to ISO)
const COUNTRY_MAP: Record<string, { isoA2: string; isoA3: string; englishName: string; flag: string }> = {
  romania: { isoA2: "RO", isoA3: "ROU", englishName: "Romania", flag: "🇷🇴" },
  românia: { isoA2: "RO", isoA3: "ROU", englishName: "Romania", flag: "🇷🇴" },
  italia: { isoA2: "IT", isoA3: "ITA", englishName: "Italy", flag: "🇮🇹" },
  italy: { isoA2: "IT", isoA3: "ITA", englishName: "Italy", flag: "🇮🇹" },
  japonia: { isoA2: "JP", isoA3: "JPN", englishName: "Japan", flag: "🇯🇵" },
  japan: { isoA2: "JP", isoA3: "JPN", englishName: "Japan", flag: "🇯🇵" },
  elvetia: { isoA2: "CH", isoA3: "CHE", englishName: "Switzerland", flag: "🇨🇭" },
  elveția: { isoA2: "CH", isoA3: "CHE", englishName: "Switzerland", flag: "🇨🇭" },
  switzerland: { isoA2: "CH", isoA3: "CHE", englishName: "Switzerland", flag: "🇨🇭" },
  franta: { isoA2: "FR", isoA3: "FRA", englishName: "France", flag: "🇫🇷" },
  franța: { isoA2: "FR", isoA3: "FRA", englishName: "France", flag: "🇫🇷" },
  france: { isoA2: "FR", isoA3: "FRA", englishName: "France", flag: "🇫🇷" },
  spania: { isoA2: "ES", isoA3: "ESP", englishName: "Spain", flag: "🇪🇸" },
  spain: { isoA2: "ES", isoA3: "ESP", englishName: "Spain", flag: "🇪🇸" },
  grecia: { isoA2: "GR", isoA3: "GRC", englishName: "Greece", flag: "🇬🇷" },
  greece: { isoA2: "GR", isoA3: "GRC", englishName: "Greece", flag: "🇬🇷" },
  germania: { isoA2: "DE", isoA3: "DEU", englishName: "Germany", flag: "🇩🇪" },
  germany: { isoA2: "DE", isoA3: "DEU", englishName: "Germany", flag: "🇩🇪" },
  austria: { isoA2: "AT", isoA3: "AUT", englishName: "Austria", flag: "🇦🇹" },
  ungaria: { isoA2: "HU", isoA3: "HUN", englishName: "Hungary", flag: "🇭🇺" },
  hungary: { isoA2: "HU", isoA3: "HUN", englishName: "Hungary", flag: "🇭🇺" },
  islanda: { isoA2: "IS", isoA3: "ISL", englishName: "Iceland", flag: "🇮🇸" },
  iceland: { isoA2: "IS", isoA3: "ISL", englishName: "Iceland", flag: "🇮🇸" },
  norvegia: { isoA2: "NO", isoA3: "NOR", englishName: "Norway", flag: "🇳🇴" },
  norway: { isoA2: "NO", isoA3: "NOR", englishName: "Norway", flag: "🇳🇴" },
  portugalia: { isoA2: "PT", isoA3: "PRT", englishName: "Portugal", flag: "🇵🇹" },
  portugal: { isoA2: "PT", isoA3: "PRT", englishName: "Portugal", flag: "🇵🇹" },
  croatia: { isoA2: "HR", isoA3: "HRV", englishName: "Croatia", flag: "🇭🇷" },
  croația: { isoA2: "HR", isoA3: "HRV", englishName: "Croatia", flag: "🇭🇷" },
  turcia: { isoA2: "TR", isoA3: "TUR", englishName: "Turkey", flag: "🇹🇷" },
  turkey: { isoA2: "TR", isoA3: "TUR", englishName: "Turkey", flag: "🇹🇷" },
  sua: { isoA2: "US", isoA3: "USA", englishName: "United States of America", flag: "🇺🇸" },
  "statele unite": { isoA2: "US", isoA3: "USA", englishName: "United States of America", flag: "🇺🇸" },
  usa: { isoA2: "US", isoA3: "USA", englishName: "United States of America", flag: "🇺🇸" },
  "regatul unit": { isoA2: "GB", isoA3: "GBR", englishName: "United Kingdom", flag: "🇬🇧" },
  anglia: { isoA2: "GB", isoA3: "GBR", englishName: "United Kingdom", flag: "🇬🇧" },
  uk: { isoA2: "GB", isoA3: "GBR", englishName: "United Kingdom", flag: "🇬🇧" },
};

/**
 * Extracts and groups visited countries from all trips and photos
 */
export function extractVisitedCountries(trips: TripData[]): VisitedCountry[] {
  const countryMap = new Map<string, VisitedCountry>();

  for (const trip of trips) {
    if (trip.status === "PLANNED") continue;

    for (const photo of trip.photos) {
      const rawCountry = (photo.country || "").trim();
      if (!rawCountry) continue;

      const normalizedKey = rawCountry.toLowerCase();
      const meta = COUNTRY_MAP[normalizedKey] || {
        isoA2: rawCountry.slice(0, 2).toUpperCase(),
        isoA3: rawCountry.slice(0, 3).toUpperCase(),
        englishName: rawCountry,
        flag: "🌍",
      };

      const groupKey = meta.isoA2;

      if (!countryMap.has(groupKey)) {
        countryMap.set(groupKey, {
          name: rawCountry,
          normalizedName: meta.englishName,
          isoA2: meta.isoA2,
          isoA3: meta.isoA3,
          flag: meta.flag,
          firstVisitDate: photo.takenAt || trip.startDate,
          tripsCount: 1,
          photosCount: 1,
          cities: photo.city ? [photo.city] : [],
          samplePhotoUrl: photo.thumbnailUrl || photo.url,
        });
      } else {
        const entry = countryMap.get(groupKey)!;
        entry.photosCount += 1;
        if (photo.city && !entry.cities.includes(photo.city)) {
          entry.cities.push(photo.city);
        }
        // Update earliest visit date
        const photoDate = new Date(photo.takenAt || trip.startDate).getTime();
        const existingDate = new Date(entry.firstVisitDate).getTime();
        if (photoDate < existingDate) {
          entry.firstVisitDate = photo.takenAt || trip.startDate;
        }
        if (!entry.samplePhotoUrl && (photo.thumbnailUrl || photo.url)) {
          entry.samplePhotoUrl = photo.thumbnailUrl || photo.url;
        }
      }
    }
  }

  // Count unique trips per country
  for (const [groupKey, country] of countryMap.entries()) {
    const uniqueTrips = new Set<string>();
    for (const trip of trips) {
      if (trip.status === "PLANNED") continue;
      const hasPhoto = trip.photos.some((p) => {
        const pKey = (p.country || "").toLowerCase();
        const m = COUNTRY_MAP[pKey];
        return m ? m.isoA2 === groupKey : pKey.slice(0, 2).toUpperCase() === groupKey;
      });
      if (hasPhoto) uniqueTrips.add(trip.id);
    }
    country.tripsCount = Math.max(1, uniqueTrips.size);
  }

  return Array.from(countryMap.values()).sort((a, b) =>
    new Date(a.firstVisitDate).getTime() - new Date(b.firstVisitDate).getTime()
  );
}

/**
 * Calculates global exploration metrics
 */
export function getExplorationStats(visitedCountries: VisitedCountry[]): ExplorationStats {
  const totalVisited = visitedCountries.length;
  // 195 sovereign states in the world
  const percentageOfWorld = Number(((totalVisited / 195) * 100).toFixed(1));

  const allCities = new Set<string>();
  for (const c of visitedCountries) {
    for (const city of c.cities) {
      allCities.add(city);
    }
  }

  let rankTitle = "Rătăcitor Curios";
  let rankBadge = "🌱 Nivel 1";
  if (totalVisited >= 15) {
    rankTitle = "Călător Cosmic de Elită";
    rankBadge = "👑 Nivel 5";
  } else if (totalVisited >= 10) {
    rankTitle = "Navigator Transcontinental";
    rankBadge = "⚡ Nivel 4";
  } else if (totalVisited >= 6) {
    rankTitle = "Explorator Internațional";
    rankBadge = "🧭 Nivel 3";
  } else if (totalVisited >= 3) {
    rankTitle = "Drumeț de Cursă Lungă";
    rankBadge = "🎒 Nivel 2";
  }

  return {
    totalVisited,
    percentageOfWorld,
    totalCities: allCities.size,
    rankTitle,
    rankBadge,
  };
}
