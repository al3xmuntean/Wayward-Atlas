"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Globe3D, Globe3DRef } from "@/components/Globe3D";
import { GlobeMap, GlobeMapRef } from "@/components/GlobeMap";
import { TimelineSlider } from "@/components/TimelineSlider";
import { GlobeSearch } from "@/components/GlobeSearch";
import { TripDrawer } from "@/components/TripDrawer";
import { UploadModal } from "@/components/UploadModal";
import { AdminUsersModal } from "@/components/AdminUsersModal";
import { SafeUser, TripData, PhotoData } from "@/lib/types";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'sphere' (True 3D Earth Globe) vs 'flat' (Detailed MapLibre Map)
  const [viewMode, setViewMode] = useState<"sphere" | "flat">("sphere");

  // Filters state
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer & Selection state
  const [selectedTrip, setSelectedTrip] = useState<TripData | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

  const globe3DRef = useRef<Globe3DRef>(null);
  const globeMapRef = useRef<GlobeMapRef>(null);

  // Load session
  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setCurrentUser(data.user);
    } catch {
      setCurrentUser(null);
    }
  };

  // Load trips
  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/trips");
      const data = await res.json();
      if (data.trips) {
        setTrips(data.trips);
      }
    } catch (err) {
      console.error("Error loading trips:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    fetchTrips();
  }, []);

  // Compute available unique years from trips
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    trips.forEach((t) => yearsSet.add(t.year));
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [trips]);

  // Compute all available tags for search suggestions
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    trips.forEach((t) => {
      t.photos.forEach((p) => {
        p.tags?.forEach((tag) => tagsSet.add(tag.toLowerCase()));
      });
    });
    return Array.from(tagsSet);
  }, [trips]);

  // Filter photos and trips according to timeline and search criteria
  const filteredPhotos = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const result: Array<{ photo: PhotoData; trip: TripData }> = [];

    trips.forEach((trip) => {
      // 1. Year filter
      if (selectedYear !== null && trip.year !== selectedYear) {
        return;
      }

      trip.photos.forEach((photo) => {
        // 2. Month filter (if set and not in guest mode)
        if (selectedMonth !== null && !trip.isMaskedDate) {
          const photoMonth = new Date(photo.takenAt).getMonth() + 1;
          if (photoMonth !== selectedMonth) return;
        }

        // 3. Search query filter (matches placeName, city, country, year, or AI tags)
        if (normalizedQuery) {
          const matchesTitle = trip.title.toLowerCase().includes(normalizedQuery);
          const matchesPlace = photo.placeName?.toLowerCase().includes(normalizedQuery) || false;
          const matchesCity = photo.city?.toLowerCase().includes(normalizedQuery) || false;
          const matchesCountry = photo.country?.toLowerCase().includes(normalizedQuery) || false;
          const matchesYear = trip.year.toString().includes(normalizedQuery);
          const matchesTag = photo.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

          if (!matchesTitle && !matchesPlace && !matchesCity && !matchesCountry && !matchesYear && !matchesTag) {
            return;
          }
        }

        result.push({ photo, trip });
      });
    });

    return result;
  }, [trips, selectedYear, selectedMonth, searchQuery]);

  // Handle marker selection
  const handleSelectPhoto = (photo: PhotoData, trip: TripData) => {
    setSelectedTrip(trip);
    setSelectedPhoto(photo);
  };

  // Fly to location helper
  const handleFlyTo = (lat: number, lon: number) => {
    if (viewMode === "sphere") {
      globe3DRef.current?.flyToLocation(lat, lon, 0.55);
    } else {
      globeMapRef.current?.flyToLocation(lat, lon, 12);
    }
  };

  // Handle comment creation
  const handleAddComment = async (tripId: string, content: string) => {
    const res = await fetch(`/api/trips/${tripId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Eroare la adăugarea comentariului");
    }

    const { comment } = await res.json();

    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, comments: [...t.comments, comment] } : t))
    );

    if (selectedTrip?.id === tripId) {
      setSelectedTrip((prev) => (prev ? { ...prev, comments: [...prev.comments, comment] } : null));
    }
  };

  // Handle trip deletion (Admin)
  const handleDeleteTrip = async (tripId: string) => {
    const res = await fetch(`/api/trips/${tripId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Eroare la ștergerea călătoriei");
      return;
    }

    setTrips((prev) => prev.filter((t) => t.id !== tripId));
    if (selectedTrip?.id === tripId) {
      setSelectedTrip(null);
      setSelectedPhoto(null);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setSelectedTrip(null);
    setSelectedPhoto(null);
    fetchTrips();
  };

  const totalPhotosCount = useMemo(() => {
    return trips.reduce((acc, t) => acc + t.photos.length, 0);
  }, [trips]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* Top Navigation */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenUsersModal={() => setIsUsersModalOpen(true)}
        tripsCount={trips.length}
        photosCount={totalPhotosCount}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((m) => (m === "sphere" ? "flat" : "sphere"))}
      />

      {/* Main 3D Spherical Earth Globe (Default) or Detailed Map */}
      {viewMode === "sphere" ? (
        <Globe3D
          ref={globe3DRef}
          trips={trips}
          filteredPhotos={filteredPhotos}
          onSelectPhoto={handleSelectPhoto}
          selectedPhoto={selectedPhoto}
        />
      ) : (
        <GlobeMap
          ref={globeMapRef}
          trips={trips}
          filteredPhotos={filteredPhotos}
          onSelectPhoto={handleSelectPhoto}
          selectedPhoto={selectedPhoto}
        />
      )}

      {/* Search Bar on Globe */}
      <GlobeSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        matchesCount={filteredPhotos.length}
        totalPinsCount={totalPhotosCount}
        availableTags={availableTags}
      />

      {/* Floating Timeline Slider at the bottom (Year / Month / Day + Auto-Play) */}
      <TimelineSlider
        years={availableYears}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onSelectYear={setSelectedYear}
        onSelectMonth={setSelectedMonth}
        isGuest={!currentUser}
      />

      {/* Trip Story Drawer (Right Sidebar) */}
      <TripDrawer
        trip={selectedTrip}
        selectedPhoto={selectedPhoto}
        onClose={() => {
          setSelectedTrip(null);
          setSelectedPhoto(null);
        }}
        onSelectPhoto={setSelectedPhoto}
        currentUser={currentUser}
        onAddComment={handleAddComment}
        onDeleteTrip={handleDeleteTrip}
        onTagClick={(tag) => setSearchQuery(tag)}
        onFlyToPhoto={handleFlyTo}
      />

      {/* Upload Modal (EXIF + AI Person Privacy Detection + AI Location Fallback) */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onTripCreated={() => {
          fetchTrips();
          if (viewMode === "sphere") {
            globe3DRef.current?.resetView();
          } else {
            globeMapRef.current?.resetView();
          }
        }}
      />

      {/* Admin Users & Permissions Management Modal */}
      <AdminUsersModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
      />
    </main>
  );
}
