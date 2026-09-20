export type UserRole = "ADMIN" | "USER" | "VIEWER";

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

export interface TripData {
  id: string;
  title: string;
  description?: string | null;
  startDate: string; // ISO string
  endDate?: string | null;
  year: number;
  isPrivate: boolean;
  createdById: string;
  photos: PhotoData[];
  comments: CommentData[];
  allowedUserIds?: string[];
  isMaskedDate?: boolean; // true for guest/viewer (only year visible)
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
