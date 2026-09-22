"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Navbar, ViewMode } from "@/components/Navbar";
import { Globe3D, Globe3DRef } from "@/components/Globe3D";
import { GlobeMap, GlobeMapRef } from "@/components/GlobeMap";
import { TimelineSlider } from "@/components/TimelineSlider";
import { GlobeSearch } from "@/components/GlobeSearch";
import { TripDrawer } from "@/components/TripDrawer";
import { UploadModal } from "@/components/UploadModal";
import { AdminUsersModal } from "@/components/AdminUsersModal";
import { EditTripModal } from "@/components/EditTripModal";
import { TravelPlannerModal } from "@/components/TravelPlannerModal";
import { CssNectarShowcase } from "@/components/CssNectarShowcase";
import { AuthModal } from "@/components/AuthModal";
import { VirtualPassportModal } from "@/components/VirtualPassportModal";
import { AtlasWrappedModal } from "@/components/AtlasWrappedModal";
import { AccessRestrictedModal } from "@/components/AccessRestrictedModal";
import { SafeUser, TripData, PhotoData } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/context";
import { Star, Shield, Heart, Eye } from "lucide-react";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'gallery' (CSS Nectar Showcase with Random Travel & Cosmic Distance), 'sphere' (True 3D Earth Globe), 'flat' (Detailed Map)
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTravelPlannerOpen, setIsTravelPlannerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripData | null>(null);
  const [a11yNotice, setA11yNotice] = useState<string>("");
  const { t } = useTranslation();

  // Deep linking and access control state
  const [accessModalState, setAccessModalState] = useState<{
    isOpen: boolean;
    errorCode: "AUTH_REQUIRED" | "FORBIDDEN" | "NOT_FOUND" | null;
    requiredRole?: string;
    itemTitle?: string;
  }>({
    isOpen: false,
    errorCode: null,
  });

  const globe3DRef = useRef<Globe3DRef>(null);
  const globeMapRef = useRef<GlobeMapRef>(null);

  const handleFlyTo = (lat: number, lon: number) => {
    if (viewMode === "sphere") {
      globe3DRef.current?.flyToLocation(lat, lon, 0.4);
    } else {
      globeMapRef.current?.flyToLocation(lat, lon, 12);
    }
  };

  const handleSelectViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setA11yNotice(
      mode === "gallery"
        ? "Comutat la galeria Showcase stil CSS Nectar cu Odometru Cosmic"
        : mode === "sphere"
        ? "Comutat la globul 3D interactiv Terra"
        : "Comutat la harta detaliată a expedițiilor"
    );
  };


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

  // Handle URL deep-links (?trip=<id> and ?photo=<id>) with role-based validation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const tripParam = urlParams.get("trip");
    const photoParam = urlParams.get("photo");

    if (!tripParam && !photoParam) return;

    const resolveDeepLink = async () => {
      if (tripParam) {
        try {
          const res = await fetch(`/api/trips/${tripParam}`);
          const data = await res.json();
          if (res.ok && data.trip) {
            setSelectedTrip(data.trip);
            if (photoParam) {
              const matchedPhoto = data.trip.photos.find((p: PhotoData) => p.id === photoParam);
              if (matchedPhoto) {
                setSelectedPhoto(matchedPhoto);
                handleFlyTo(matchedPhoto.latitude, matchedPhoto.longitude);
              }
            } else if (data.trip.latitude && data.trip.longitude) {
              handleFlyTo(data.trip.latitude, data.trip.longitude);
            }
          } else {
            setAccessModalState({
              isOpen: true,
              errorCode:
                data.code || (res.status === 401 ? "AUTH_REQUIRED" : res.status === 403 ? "FORBIDDEN" : "NOT_FOUND"),
              requiredRole: data.requiredRole,
              itemTitle: data.tripTitle || data.photoTitle,
            });
          }
        } catch {
          setAccessModalState({
            isOpen: true,
            errorCode: "NOT_FOUND",
          });
        }
      } else if (photoParam) {
        try {
          const res = await fetch(`/api/photos/${photoParam}`);
          const data = await res.json();
          if (res.ok && data.photo) {
            setSelectedPhoto(data.photo);
            handleFlyTo(data.photo.latitude, data.photo.longitude);
            if (data.tripId) {
              const tripRes = await fetch(`/api/trips/${data.tripId}`);
              const tripData = await tripRes.json();
              if (tripRes.ok && tripData.trip) setSelectedTrip(tripData.trip);
            }
          } else {
            setAccessModalState({
              isOpen: true,
              errorCode: data.code || (res.status === 401 ? "AUTH_REQUIRED" : "FORBIDDEN"),
              requiredRole: data.requiredRole,
              itemTitle: data.photoTitle,
            });
          }
        } catch {
          setAccessModalState({
            isOpen: true,
            errorCode: "NOT_FOUND",
          });
        }
      }
    };

    resolveDeepLink();
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

      // Handle PLANNED trips that don't have uploaded photos yet
      if (trip.status === "PLANNED" && trip.photos.length === 0 && trip.latitude && trip.longitude) {
        if (normalizedQuery) {
          const matchTitle = trip.title.toLowerCase().includes(normalizedQuery);
          const matchDest = trip.planData?.destination?.toLowerCase().includes(normalizedQuery);
          if (!matchTitle && !matchDest) return;
        }

        const plannedPhoto: PhotoData = {
          id: `planned-${trip.id}`,
          tripId: trip.id,
          url: "",
          thumbnailUrl: "",
          latitude: trip.latitude,
          longitude: trip.longitude,
          placeName: trip.planData?.destination || trip.title,
          country: trip.planData?.country,
          city: trip.planData?.city,
          takenAt: trip.startDate,
          hasPeople: false,
          isPrivate: true,
          tags: ["planned", "travel-assist"],
        };

        result.push({ photo: plannedPhoto, trip });
        return;
      }

      trip.photos.forEach((photo) => {
        // 2. Month filter (if set and not in public mode)
        if (selectedMonth !== null && !trip.isCountryShowcase && !trip.isMaskedDate) {
          const m = new Date(photo.takenAt).getMonth() + 1;
          if (m !== selectedMonth) return;
        }

        // 3. Search query filter
        if (normalizedQuery) {
          const matchTitle = trip.title.toLowerCase().includes(normalizedQuery);
          const matchPlace = photo.placeName?.toLowerCase().includes(normalizedQuery);
          const matchCountry = photo.country?.toLowerCase().includes(normalizedQuery);
          const matchCity = photo.city?.toLowerCase().includes(normalizedQuery);
          const matchTags = photo.tags?.some((t) => t.toLowerCase().includes(normalizedQuery));

          if (!matchTitle && !matchPlace && !matchCountry && !matchCity && !matchTags) {
            return;
          }
        }

        result.push({ photo, trip });
      });
    });

    return result;
  }, [trips, selectedYear, selectedMonth, searchQuery]);

  const totalPhotosCount = useMemo(() => {
    return trips.reduce((acc, t) => acc + t.photos.length, 0);
  }, [trips]);

  const handleSelectPhoto = (photo: PhotoData, trip: TripData) => {
    setSelectedTrip(trip);
    setSelectedPhoto(photo);
  };

  const handleAddComment = async (tripId: string, content: string) => {
    try {
      const res = await fetch(`/api/trips/${tripId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error("Eroare la adăugarea comentariului");

      const data = await res.json();

      setTrips((prev) =>
        prev.map((t) => {
          if (t.id === tripId) {
            return {
              ...t,
              comments: [...t.comments, data.comment],
            };
          }
          return t;
        })
      );

      if (selectedTrip && selectedTrip.id === tripId) {
        setSelectedTrip((prev) => (prev ? { ...prev, comments: [...prev.comments, data.comment] } : null));
      }
    } catch (err: any) {
      alert(err.message || "Eroare la adăugarea comentariului");
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Eroare la ștergerea călătoriei");

      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      setSelectedTrip(null);
      setSelectedPhoto(null);
    } catch (err: any) {
      alert(err.message || "Eroare la ștergerea călătoriei");
    }
  };

  const handleTripUpdated = (updatedTrip: TripData) => {
    setTrips((prev) => prev.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)));
    if (selectedTrip?.id === updatedTrip.id) {
      setSelectedTrip(updatedTrip);
    }
  };

  const handlePhotoUpdated = (updatedPhoto: PhotoData) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id === updatedPhoto.tripId) {
          return {
            ...t,
            photos: t.photos.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p)),
          };
        }
        return t;
      })
    );
    if (selectedPhoto?.id === updatedPhoto.id) {
      setSelectedPhoto(updatedPhoto);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      fetchTrips();
      setSelectedTrip(null);
      setSelectedPhoto(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const isPublicMode = !currentUser;

  return (
    <main
      id="main-content"
      role="main"
      className="relative w-screen h-screen overflow-hidden bg-[var(--bg-primary)]"
    >
      {/* Centralized Screen Reader Live Announcer Region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {a11yNotice}
      </div>

      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenUsersModal={() => setIsUsersModalOpen(true)}
        onOpenTravelPlanner={() => setIsTravelPlannerOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenPassport={() => setIsPassportOpen(true)}
        onOpenWrapped={() => setIsWrappedOpen(true)}
        tripsCount={trips.length}
        photosCount={totalPhotosCount}
        viewMode={viewMode}
        onSelectViewMode={handleSelectViewMode}
      />

      {/* Role State Pill Banner (Top Center) - Only on Globe / Map views on larger screens */}
      {viewMode !== "gallery" && (
        <div className="hidden sm:block absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-fade-in">
          {isPublicMode ? (
            <div className="glass-panel px-4 py-1.5 rounded-full border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-2 shadow-sm">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Mod Public: Vizualizezi țările explorate și fotografiile reprezentative</span>
            </div>
          ) : currentUser?.role === "PARTNER" ? (
            <div className="glass-panel px-4 py-1.5 rounded-full border border-rose-500/40 text-rose-900 dark:text-rose-200 text-xs font-semibold flex items-center gap-2 shadow-sm">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>Autentificat ca Partener: Toate amintirile și călătoriile în doi sunt active</span>
            </div>
          ) : currentUser?.role === "CLOSE_FRIEND" ? (
            <div className="glass-panel px-4 py-1.5 rounded-full border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-2 shadow-sm">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <span>Autentificat ca Prieten: Pozele cu oameni sunt vizibile</span>
            </div>
          ) : currentUser?.role === "VIEWER" ? (
            <div className="glass-panel px-4 py-1.5 rounded-full border border-olive-500/40 text-olive-900 dark:text-olive-200 text-xs font-semibold flex items-center gap-2 shadow-sm">
              <Eye className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400" />
              <span>Autentificat ca Viewer: Date complete, peisaje fără persoane</span>
            </div>
          ) : (
            <div className="glass-panel px-4 py-1.5 rounded-full border border-olive-600/40 text-olive-900 dark:text-olive-200 text-xs font-semibold flex items-center gap-2 shadow-sm bg-olive-500/10 dark:bg-olive-950/60">
              <Shield className="w-3.5 h-3.5 text-olive-700 dark:text-olive-400" />
              <span>Mod Administrator (Alex): Acces total, Studio și Editare active</span>
            </div>
          )}
        </div>
      )}

      {/* Main View: CSS Nectar Showcase Gallery vs 3D Globe vs Detailed Flat Map */}
      {viewMode === "gallery" ? (
        <div className="w-full h-full overflow-y-auto">
          <CssNectarShowcase
            trips={trips}
            onSelectTrip={(trip, photo) => {
              setSelectedTrip(trip);
              setSelectedPhoto(photo || trip.photos[0] || null);
            }}
            onFlyToLocation={(lat, lon) => {
              setViewMode("sphere");
              setTimeout(() => handleFlyTo(lat, lon), 250);
            }}
            currentUser={currentUser}
            onOpenTravelPlanner={() => setIsTravelPlannerOpen(true)}
            onOpenPassport={() => setIsPassportOpen(true)}
            onOpenWrapped={() => setIsWrappedOpen(true)}
          />
        </div>
      ) : viewMode === "sphere" ? (
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

      {/* Search Bar & Timeline Slider (Shown when exploring Globe / Map) */}
      {viewMode !== "gallery" && (
        <>
          <GlobeSearch
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            matchesCount={filteredPhotos.length}
            totalPinsCount={totalPhotosCount}
            availableTags={availableTags}
          />

          <TimelineSlider
            years={availableYears}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onSelectYear={setSelectedYear}
            onSelectMonth={setSelectedMonth}
            isGuest={isPublicMode}
          />

        </>
      )}

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
        onEditTrip={(trip) => {
          setEditingTrip(trip);
          setIsEditModalOpen(true);
        }}
        onPhotoUpdated={handlePhotoUpdated}
        onTripUpdated={handleTripUpdated}
        onOpenUploadForTrip={(trip) => {
          setIsUploadOpen(true);
        }}
        onTagClick={(tag) => setSearchQuery(tag)}
        onFlyToPhoto={handleFlyTo}
      />

      {/* Travel Assist Planner Modal (Gemini AI) */}
      {isTravelPlannerOpen && (
        <TravelPlannerModal
          onClose={() => setIsTravelPlannerOpen(false)}
          onTripCreated={(newTrip) => {
            setTrips((prev) => [newTrip, ...prev]);
            setSelectedTrip(newTrip);
            if (newTrip.latitude && newTrip.longitude) {
              if (viewMode === "sphere") {
                globe3DRef.current?.flyToLocation(newTrip.latitude, newTrip.longitude, 0.6);
              } else {
                globeMapRef.current?.flyToLocation(newTrip.latitude, newTrip.longitude, 6);
              }
            }
          }}
        />
      )}

      {/* Admin Photo Manager & Studio Modal */}
      {isUploadOpen && (
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
      )}

      {/* Admin Users & Permissions Management Modal */}
      {isUsersModalOpen && (
        <AdminUsersModal
          isOpen={isUsersModalOpen}
          onClose={() => setIsUsersModalOpen(false)}
        />
      )}

      {/* Admin Edit Trip Modal */}
      {isEditModalOpen && editingTrip && (
        <EditTripModal
          trip={editingTrip}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTrip(null);
          }}
          onTripUpdated={handleTripUpdated}
          onTripDeleted={(tripId) => {
            handleDeleteTrip(tripId);
            setIsEditModalOpen(false);
            setEditingTrip(null);
          }}
        />
      )}

      {/* Persistent Auth Modal (Google OAuth & Roles) */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={(u) => {
            setCurrentUser(u);
            checkAuth();
            fetchTrips();
          }}
        />
      )}

      {/* Virtual Passport Modal (Official Travel Document & Stamps) */}
      {isPassportOpen && (
        <VirtualPassportModal
          isOpen={isPassportOpen}
          onClose={() => setIsPassportOpen(false)}
          trips={trips}
          currentUser={currentUser}
          onSelectCountry={(countryName) => {
            setSearchQuery(countryName);
            setIsPassportOpen(false);
          }}
        />
      )}

      {/* Atlas Wrapped Modal (Spotify-style Annual Retrospective) */}
      {isWrappedOpen && (
        <AtlasWrappedModal
          isOpen={isWrappedOpen}
          onClose={() => setIsWrappedOpen(false)}
          trips={trips}
          currentUser={currentUser}
        />
      )}

      {/* Access Restricted Modal for Unauthorized Deep-Links */}
      {accessModalState.isOpen && (
        <AccessRestrictedModal
          isOpen={accessModalState.isOpen}
          onClose={() => setAccessModalState((prev) => ({ ...prev, isOpen: false }))}
          onOpenLogin={() => setIsAuthModalOpen(true)}
          errorCode={accessModalState.errorCode}
          requiredRole={accessModalState.requiredRole}
          itemTitle={accessModalState.itemTitle}
        />
      )}
    </main>
  );
}
