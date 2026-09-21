// User roles representing the 4 authenticated tiers (plus unauthenticated visitor as PUBLIC)
export type UserRole = "ADMIN" | "PARTNER" | "CLOSE_FRIEND" | "VIEWER";

export type VisibilityRole = "PUBLIC" | "VIEWER" | "CLOSE_FRIEND" | "PARTNER" | "ADMIN";

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  canViewPrivate?: boolean;
}

export interface PhotoData {
  id: string;
  tripId: string;
  url: string;
  thumbnailUrl: string;
  latitude: number;
  longitude: number;
  placeName?: string | null;
  country?: string | null;
  city?: string | null;
  takenAt: string; // ISO string
  takenYear?: number;
  hasPeople: boolean;
  isPrivate: boolean;
  minRole?: VisibilityRole;
  isCountryCover?: boolean;
  partnerPreselected?: boolean;
  tags: string[]; // parsed from JSON
}

export interface CommentData {
  id: string;
  tripId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface TravelItineraryDay {
  dayNumber: number;
  title: string;
  description: string;
  highlights: string[];
  targetCheckpoints: string[];
}

export interface PackingItem {
  id: string;
  item: string;
  category: "clothing" | "gear" | "documents" | "comfort";
  checked: boolean;
}

export interface WeatherForecastSummary {
  tempRange: string;
  description: string;
}

export interface LocalTip {
  title: string;
  detail: string;
}

export interface TravelPlanData {
  destination: string;
  country?: string;
  city?: string;
  days: number;
  style: string;
  summary: string;
  partnerTips?: string;
  itinerary: TravelItineraryDay[];
  allTargetCheckpoints: string[];
  packingList?: PackingItem[];
  weatherForecastSummary?: WeatherForecastSummary;
  localTips?: LocalTip[];
}

export interface TravelAchievementReport {
  score: number;
  achievedCount: number;
  totalPlanned: number;
  achieved: Array<{
    name: string;
    matchedPhotoUrl?: string;
    commentary: string;
  }>;
  missed: Array<{
    name: string;
    tip: string;
  }>;
  extraDiscoveries: Array<{
    name: string;
    commentary: string;
  }>;
  summaryText: string;
  partnerMemory?: string;
}

export interface TripData {
  id: string;
  title: string;
  description?: string | null;
  translations?: string | null;
  translationsMap?: Record<string, { title?: string; description?: string }>;
  startDate: string; // ISO string
  endDate?: string | null;
  year: number;
  isPrivate: boolean;
  minRole?: VisibilityRole;
  status?: "PLANNED" | "COMPLETED";
  latitude?: number | null;
  longitude?: number | null;
  planData?: TravelPlanData | null;
  achievementReport?: TravelAchievementReport | null;
  withPartner?: boolean; // Traveled together with partner
  partnerNotes?: string | null; // Exclusive travel memories/notes for Partner & Admin
  createdById: string;
  photos: PhotoData[];
  comments: CommentData[];
  allowedUserIds?: string[];
  isMaskedDate?: boolean; // true for public visitor (only year visible)
  isCountryShowcase?: boolean; // true when representing country-level pin in public mode
}

export interface CountryShowcase {
  country: string;
  latitude: number;
  longitude: number;
  years: number[];
  coverPhoto: PhotoData;
  tripCount: number;
}

export interface AILocationSuggestion {
  placeName: string;
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
  confidence: number;
  source: "local-llm" | "nominatim" | "heuristic";
  reasoning?: string;
}
