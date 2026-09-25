"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Upload,
  MapPin,
  Calendar,
  Lock,
  Globe2,
  Sparkles,
  Heart,
  Eye,
  Shield,
  Layers,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Search,
  ArrowLeft,
  Loader2,
  ExternalLink,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { VisibilityRole } from "@/lib/types";
import { FlagIcon } from "@/components/FlagIcon";
import { Language } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme";
import { extractPhotoMetadata } from "@/lib/exif";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { useRouter } from "next/navigation";

const CARTO_VOYAGER = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const CARTO_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export interface PhotoDraft {
  id: string;
  isExisting?: boolean; // if already on server
  file?: File;
  previewUrl: string;
  originalUrl?: string;
  thumbnailUrl?: string;
  latitude: number | null;
  longitude: number | null;
  takenAt: string;
  spotName: string;
  minRole: VisibilityRole;
  isPrivate: boolean;
  hasPeople: boolean;
  isCountryCover: boolean;
  partnerPreselected: boolean;
  caption?: string;
}

export interface SpotCluster {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  minRole: VisibilityRole;
  photoIds: string[];
}

interface TripStudioProps {
  mode: "create" | "edit";
  tripId?: string;
}

export function TripStudio({ mode, tripId }: TripStudioProps) {
  const { t, language } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  // Loading initial data for edit mode
  const [loadingInitial, setLoadingInitial] = useState(mode === "edit");
  const [errorInitial, setErrorInitial] = useState<string | null>(null);

  // Metadata form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [withPartner, setWithPartner] = useState(false);
  const [partnerNotes, setPartnerNotes] = useState("");
  const [tripMinRole, setTripMinRole] = useState<VisibilityRole>("VIEWER");

  // Multilingual state (RO, EN, DE, ES, FR)
  const [activeLangTab, setActiveLangTab] = useState<Language>("ro");
  const [translations, setTranslations] = useState<
    Record<string, { title?: string; description?: string }>
  >({
    en: { title: "", description: "" },
    de: { title: "", description: "" },
    es: { title: "", description: "" },
    fr: { title: "", description: "" },
  });
  const [translating, setTranslating] = useState(false);

  // Photos & Spots state
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [spots, setSpots] = useState<SpotCluster[]>([]);
  const [unmappedPhotoIds, setUnmappedPhotoIds] = useState<string[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Map state
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [searchingLocation, setSearchingLocation] = useState(false);

  // Progress & Submitting
  const [processingFiles, setProcessingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Refs for map callbacks
  const titleRef = useRef(title);
  useEffect(() => { titleRef.current = title; }, [title]);
  const withPartnerRef = useRef(withPartner);
  useEffect(() => { withPartnerRef.current = withPartner; }, [withPartner]);
  const spotsRef = useRef(spots);
  useEffect(() => { spotsRef.current = spots; }, [spots]);
  const unmappedPhotoIdsRef = useRef(unmappedPhotoIds);
  useEffect(() => { unmappedPhotoIdsRef.current = unmappedPhotoIds; }, [unmappedPhotoIds]);

  // =========================================================================
  // 1. FETCH INITIAL DATA FOR EDIT MODE
  // =========================================================================
  useEffect(() => {
    if (mode !== "edit" || !tripId) return;

    let isMounted = true;
    setLoadingInitial(true);

    fetch(`/api/trips/${tripId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load trip data");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const trip = data.trip;
        if (!trip) throw new Error("Trip not found");

        setTitle(trip.title || "");
        setDescription(trip.description || "");
        if (trip.startDate) {
          setStartDate(new Date(trip.startDate).toISOString().split("T")[0]);
        }
        if (trip.endDate) {
          setEndDate(new Date(trip.endDate).toISOString().split("T")[0]);
        }
        setWithPartner(Boolean(trip.withPartner));
        setPartnerNotes(trip.partnerNotes || "");
        setTripMinRole(trip.minRole || "VIEWER");

        if (trip.translations) {
          try {
            const parsed =
              typeof trip.translations === "string"
                ? JSON.parse(trip.translations)
                : trip.translations;
            setTranslations((prev) => ({ ...prev, ...parsed }));
          } catch {}
        }

        // Format existing photos
        const loadedPhotos: PhotoDraft[] = (trip.photos || []).map((p: any) => ({
          id: p.id,
          isExisting: true,
          previewUrl: p.url,
          thumbnailUrl: p.thumbnailUrl || p.url,
          originalUrl: p.originalUrl || p.url,
          latitude: p.latitude,
          longitude: p.longitude,
          takenAt: p.takenAt || new Date().toISOString(),
          spotName: p.spotName || "",
          minRole: p.minRole || "VIEWER",
          isPrivate: Boolean(p.isPrivate),
          hasPeople: Boolean(p.hasPeople),
          isCountryCover: Boolean(p.isCountryCover),
          partnerPreselected: Boolean(p.partnerPreselected),
          caption: p.caption || "",
        }));

        setPhotos(loadedPhotos);

        // Group into spots by spotName or proximity
        const clusters: SpotCluster[] = [];
        const unmapped: string[] = [];

        loadedPhotos.forEach((p) => {
          if (!p.latitude || !p.longitude) {
            unmapped.push(p.id);
            return;
          }

          // Match by spotName if available or proximity (< 150m)
          let match = clusters.find(
            (c) =>
              (p.spotName && c.name.toLowerCase() === p.spotName.toLowerCase()) ||
              (Math.abs(c.latitude - p.latitude!) < 0.0015 &&
                Math.abs(c.longitude - p.longitude!) < 0.0015)
          );

          if (match) {
            match.photoIds.push(p.id);
          } else {
            const spotName = p.spotName || `Punct ${clusters.length + 1}`;
            clusters.push({
              id: `spot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: spotName,
              description: "",
              latitude: p.latitude!,
              longitude: p.longitude!,
              minRole: p.minRole,
              photoIds: [p.id],
            });
          }
        });

        setSpots(clusters);
        setUnmappedPhotoIds(unmapped);

        // If map is loaded, fly to first spot
        if (clusters.length > 0 && mapRef.current) {
          const first = clusters[0];
          mapRef.current.flyTo({ center: [first.longitude, first.latitude], zoom: 12 });
          setSelectedSpotId(first.id);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorInitial(err.message || "Failed to load trip");
      })
      .finally(() => {
        if (isMounted) setLoadingInitial(false);
      });

    return () => {
      isMounted = false;
    };
  }, [mode, tripId]);

  // =========================================================================
  // 2. AI MULTILINGUAL TRANSLATION (RO -> EN, DE, ES, FR)
  // =========================================================================
  const handleTranslateAll = async () => {
    if (!title.trim()) return;
    setTranslating(true);

    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText: title,
          description: description || undefined,
          targetLanguages: ["en", "de", "es", "fr"],
        }),
      });

      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();

      if (data.translations) {
        setTranslations((prev) => ({
          ...prev,
          ...data.translations,
        }));
      }
    } catch (err) {
      console.warn("AI translation error:", err);
    } finally {
      setTranslating(false);
    }
  };

  // =========================================================================
  // 3. FILE INGESTION & ROBUST EXIF EXTRACTION
  // =========================================================================
  const handleFilesSelected = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setProcessingFiles(true);

    const filesArray = Array.from(files);
    const newDrafts: PhotoDraft[] = [];
    const newUnmapped: string[] = [];

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      const previewUrl = URL.createObjectURL(file);
      const photoId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      let lat: number | null = null;
      let lon: number | null = null;
      let takenAt = new Date().toISOString();

      try {
        const meta = await extractPhotoMetadata(file);
        lat = meta.latitude;
        lon = meta.longitude;
        takenAt = meta.takenAt;
      } catch (err) {
        console.warn("Could not extract EXIF for file:", file.name, err);
      }

      const draft: PhotoDraft = {
        id: photoId,
        isExisting: false,
        file,
        previewUrl,
        latitude: lat,
        longitude: lon,
        takenAt,
        spotName: "",
        minRole: withPartner ? "PARTNER" : "VIEWER",
        isPrivate: false,
        hasPeople: false,
        isCountryCover: false,
        partnerPreselected: withPartner,
      };

      newDrafts.push(draft);
      if (lat === null || lon === null) {
        newUnmapped.push(photoId);
      }
    }

    // Auto-cluster photos with GPS into Spots (~150m radius)
    const updatedSpots = [...spots];

    newDrafts.forEach((draft) => {
      if (draft.latitude === null || draft.longitude === null) return;

      const matched = updatedSpots.find((s) => {
        const dLat = Math.abs(s.latitude - draft.latitude!);
        const dLon = Math.abs(s.longitude - draft.longitude!);
        return dLat < 0.0015 && dLon < 0.0015;
      });

      if (matched) {
        matched.photoIds.push(draft.id);
        draft.spotName = matched.name;
      } else {
        const newSpotId = `spot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const defaultName = `${t("studio.spotDefaultName")} ${updatedSpots.length + 1}`;
        updatedSpots.push({
          id: newSpotId,
          name: defaultName,
          description: "",
          latitude: draft.latitude,
          longitude: draft.longitude,
          minRole: withPartner ? "PARTNER" : "VIEWER",
          photoIds: [draft.id],
        });
        draft.spotName = defaultName;
      }
    });

    setPhotos((prev) => [...prev, ...newDrafts]);
    setSpots(updatedSpots);
    setUnmappedPhotoIds((prev) => [...prev, ...newUnmapped]);
    setProcessingFiles(false);

    // If new spots created and map exists, center on first new spot
    if (updatedSpots.length > 0 && mapRef.current) {
      const first = updatedSpots[0];
      mapRef.current.flyTo({ center: [first.longitude, first.latitude], zoom: 12 });
      setSelectedSpotId(first.id);
    }
  };

  // Remove photo
  const handleRemovePhoto = (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (photo?.isExisting) {
      setDeletedPhotoIds((prev) => [...prev, photoId]);
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setUnmappedPhotoIds((prev) => prev.filter((id) => id !== photoId));
    setSpots((prev) =>
      prev
        .map((s) => ({
          ...s,
          photoIds: s.photoIds.filter((id) => id !== photoId),
        }))
        .filter((s) => s.photoIds.length > 0)
    );
  };

  // Assign unmapped photos to specific lat/lon
  const assignUnmappedToLocation = useCallback(
    (lat: number, lng: number, customName?: string) => {
      const unmapped = unmappedPhotoIdsRef.current;
      if (unmapped.length === 0) return;

      const newSpotId = `spot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const defaultName =
        customName ||
        (titleRef.current.trim()
          ? titleRef.current.trim()
          : `${t("studio.spotDefaultName")} ${spotsRef.current.length + 1}`);

      const newSpot: SpotCluster = {
        id: newSpotId,
        name: defaultName,
        description: "",
        latitude: lat,
        longitude: lng,
        minRole: withPartnerRef.current ? "PARTNER" : "VIEWER",
        photoIds: [...unmapped],
      };

      setSpots((prev) => [...prev, newSpot]);
      setPhotos((prev) =>
        prev.map((p) =>
          unmapped.includes(p.id)
            ? { ...p, latitude: lat, longitude: lng, spotName: defaultName }
            : p
        )
      );
      setUnmappedPhotoIds([]);
      setSelectedSpotId(newSpotId);

      if (mapRef.current) {
        mapRef.current.flyTo({ center: [lng, lat], zoom: 13 });
      }
    },
    [t]
  );

  const assignUnmappedRef = useRef(assignUnmappedToLocation);
  useEffect(() => {
    assignUnmappedRef.current = assignUnmappedToLocation;
  }, [assignUnmappedToLocation]);

  // =========================================================================
  // 4. MAPLIBRE INITIALIZATION & DRAGGABLE MARKERS
  // =========================================================================
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialStyle = theme === "dark" ? CARTO_DARK : CARTO_VOYAGER;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: [24.12, 45.79], // Sibiu default
      zoom: 5,
      minZoom: 2,
      maxZoom: 18,
    });

    const navControl = new maplibregl.NavigationControl({
      showCompass: true,
      visualizePitch: true,
    });
    map.addControl(navControl, "top-right");

    map.on("load", () => {
      mapRef.current = map;
      map.on("click", (e) => {
        // If there are unmapped photos, assign them on map click
        if (unmappedPhotoIdsRef.current.length > 0) {
          assignUnmappedRef.current(e.lngLat.lat, e.lngLat.lng);
        }
      });
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [theme]);

  // Sync Markers with Spots
  useEffect(() => {
    if (!mapRef.current) return;

    const currentSpotIds = new Set(spots.map((s) => s.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentSpotIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    spots.forEach((spot) => {
      const isSelected = spot.id === selectedSpotId;
      const coverPhoto = photos.find((p) => spot.photoIds.includes(p.id));

      const innerHtml = coverPhoto?.previewUrl
        ? `
          <div class="relative flex flex-col items-center cursor-grab active:cursor-grabbing group">
            <div class="relative w-12 h-12 rounded-2xl p-0.5 bg-white dark:bg-slate-900 shadow-2xl border-2 ${
              isSelected
                ? "border-amber-400 ring-4 ring-amber-400/40 scale-110"
                : "border-olive-500 hover:scale-105"
            } transition-all">
              <img src="${coverPhoto.previewUrl}" alt="${spot.name}" class="w-full h-full object-cover rounded-xl" />
              <div class="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-olive-700 text-white text-[10px] font-black shadow-md border-2 border-white dark:border-slate-900 leading-none">
                ${spot.photoIds.length}
              </div>
            </div>
            <div class="mt-1 px-2 py-0.5 rounded-md bg-slate-950/90 text-[10px] text-white font-bold whitespace-nowrap shadow-lg border border-slate-700 pointer-events-none max-w-[130px] truncate text-center">
              ${spot.name}
            </div>
          </div>
        `
        : `
          <div class="relative flex flex-col items-center cursor-grab active:cursor-grabbing group">
            <div class="w-9 h-9 rounded-2xl border-2 ${
              isSelected
                ? "border-amber-400 bg-amber-600 ring-4 ring-amber-400/40 scale-110"
                : "border-olive-400 bg-olive-700 hover:scale-105"
            } text-white flex items-center justify-center font-black text-xs shadow-xl transition-all">
              ${spot.photoIds.length}
            </div>
            <div class="mt-1 px-2 py-0.5 rounded-md bg-slate-950/90 text-[10px] text-white font-bold whitespace-nowrap shadow-lg border border-slate-700 pointer-events-none max-w-[130px] truncate text-center">
              ${spot.name}
            </div>
          </div>
        `;

      if (markersRef.current.has(spot.id)) {
        const existing = markersRef.current.get(spot.id)!;
        existing.setLngLat([spot.longitude, spot.latitude]);
        existing.getElement().innerHTML = innerHtml;
        return;
      }

      const el = document.createElement("div");
      el.className = "cursor-grab active:cursor-grabbing";
      el.innerHTML = innerHtml;

      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([spot.longitude, spot.latitude])
        .addTo(mapRef.current!);

      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        setSpots((prev) =>
          prev.map((s) =>
            s.id === spot.id ? { ...s, latitude: lngLat.lat, longitude: lngLat.lng } : s
          )
        );
        setPhotos((prev) =>
          prev.map((p) =>
            spot.photoIds.includes(p.id)
              ? { ...p, latitude: lngLat.lat, longitude: lngLat.lng }
              : p
          )
        );
      });

      el.onclick = (e) => {
        e.stopPropagation();
        setSelectedSpotId(spot.id);
      };

      markersRef.current.set(spot.id, marker);
    });
  }, [spots, photos, selectedSpotId]);

  // Geocoding search
  const handleMapSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapSearchQuery.trim() || !mapRef.current) return;
    setSearchingLocation(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          mapSearchQuery.trim()
        )}&limit=1`,
        { headers: { "Accept-Language": language } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        mapRef.current.flyTo({ center: [lon, lat], zoom: 12 });

        if (unmappedPhotoIds.length > 0) {
          assignUnmappedToLocation(lat, lon, item.display_name?.split(",")[0]);
        }
      }
    } catch (err) {
      console.warn("Geocoding search error:", err);
    } finally {
      setSearchingLocation(false);
    }
  };

  // =========================================================================
  // 5. SAVE & PUBLISH (CREATE OR EDIT)
  // =========================================================================
  const handleSave = async () => {
    if (!title.trim()) {
      alert(t("studio.titleLabel") + " is required.");
      return;
    }

    if (photos.length === 0) {
      alert("At least one photo is required.");
      return;
    }

    setSubmitting(true);
    setUploadProgress(t("studio.saving"));

    try {
      // 1. Upload new photos (those without isExisting) in batches of 5
      const newPhotosToUpload = photos.filter((p) => !p.isExisting && p.file);
      const uploadedMap = new Map<string, { url: string; thumbnailUrl: string; originalUrl: string }>();

      const CHUNK_SIZE = 5;
      for (let i = 0; i < newPhotosToUpload.length; i += CHUNK_SIZE) {
        const chunk = newPhotosToUpload.slice(i, i + CHUNK_SIZE);
        setUploadProgress(
          t("studio.uploadingPhotos", {
            current: i + 1,
            total: newPhotosToUpload.length,
          })
        );

        const formData = new FormData();
        chunk.forEach((p) => {
          if (p.file) formData.append("files", p.file);
        });

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Upload failed");
        }

        const items = uploadData.uploads || [uploadData];
        chunk.forEach((p, idx) => {
          if (items[idx]) {
            uploadedMap.set(p.id, {
              url: items[idx].url,
              thumbnailUrl: items[idx].thumbnailUrl || items[idx].url,
              originalUrl: items[idx].originalUrl || items[idx].url,
            });
          }
        });
      }

      // 2. Prepare payload
      const primarySpot = spots[0];

      if (mode === "create") {
        // CREATE FLOW
        const payloadPhotos = photos.map((p) => {
          const uploaded = uploadedMap.get(p.id) || {
            url: p.previewUrl,
            thumbnailUrl: p.thumbnailUrl || p.previewUrl,
            originalUrl: p.originalUrl || p.previewUrl,
          };
          const spot = spots.find((s) => s.photoIds.includes(p.id));

          return {
            url: uploaded.url,
            thumbnailUrl: uploaded.thumbnailUrl,
            originalUrl: uploaded.originalUrl,
            latitude: p.latitude ?? spot?.latitude ?? 0,
            longitude: p.longitude ?? spot?.longitude ?? 0,
            placeName: p.spotName || spot?.name || title,
            spotName: p.spotName || spot?.name || null,
            spotDescription: spot?.description || null,
            caption: p.caption || null,
            takenAt: p.takenAt,
            hasPeople: p.hasPeople,
            isPrivate: p.isPrivate,
            minRole: p.minRole,
            partnerPreselected: p.partnerPreselected,
            isCountryCover: p.isCountryCover,
            tags: [],
          };
        });

        const tripRes = await fetch("/api/trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            startDate,
            endDate: endDate || null,
            withPartner,
            partnerNotes: withPartner ? partnerNotes : null,
            minRole: tripMinRole,
            isPrivate: tripMinRole === "ADMIN",
            latitude: primarySpot ? primarySpot.latitude : null,
            longitude: primarySpot ? primarySpot.longitude : null,
            translations,
            photos: payloadPhotos,
          }),
        });

        if (!tripRes.ok) {
          const errData = await tripRes.json();
          throw new Error(errData.error || "Failed to create trip");
        }
      } else {
        // EDIT FLOW
        const newPhotosPayload = newPhotosToUpload.map((p) => {
          const uploaded = uploadedMap.get(p.id) || {
            url: p.previewUrl,
            thumbnailUrl: p.thumbnailUrl || p.previewUrl,
            originalUrl: p.originalUrl || p.previewUrl,
          };
          const spot = spots.find((s) => s.photoIds.includes(p.id));

          return {
            url: uploaded.url,
            thumbnailUrl: uploaded.thumbnailUrl,
            originalUrl: uploaded.originalUrl,
            latitude: p.latitude ?? spot?.latitude ?? 0,
            longitude: p.longitude ?? spot?.longitude ?? 0,
            placeName: p.spotName || spot?.name || title,
            spotName: p.spotName || spot?.name || null,
            spotDescription: spot?.description || null,
            caption: p.caption || null,
            takenAt: p.takenAt,
            hasPeople: p.hasPeople,
            isPrivate: p.isPrivate,
            minRole: p.minRole,
            partnerPreselected: p.partnerPreselected,
            isCountryCover: p.isCountryCover,
            tags: [],
          };
        });

        const updatedPhotosPayload = photos
          .filter((p) => p.isExisting)
          .map((p) => {
            const spot = spots.find((s) => s.photoIds.includes(p.id));
            return {
              id: p.id,
              latitude: p.latitude ?? spot?.latitude ?? 0,
              longitude: p.longitude ?? spot?.longitude ?? 0,
              spotName: p.spotName || spot?.name || null,
              spotDescription: spot?.description || null,
              caption: p.caption || null,
              minRole: p.minRole,
              isPrivate: p.isPrivate,
              hasPeople: p.hasPeople,
            };
          });

        const tripRes = await fetch(`/api/trips/${tripId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            startDate,
            endDate: endDate || null,
            withPartner,
            partnerNotes: withPartner ? partnerNotes : null,
            minRole: tripMinRole,
            isPrivate: tripMinRole === "ADMIN",
            latitude: primarySpot ? primarySpot.latitude : null,
            longitude: primarySpot ? primarySpot.longitude : null,
            translations,
            newPhotos: newPhotosPayload,
            updatedPhotos: updatedPhotosPayload,
            deletedPhotoIds,
          }),
        });

        if (!tripRes.ok) {
          const errData = await tripRes.json();
          throw new Error(errData.error || "Failed to update trip");
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        router.push("/manage");
      }, 1200);
    } catch (err: any) {
      console.error("Save failed:", err);
      alert(err.message || "Failed to save trip.");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
        <Loader2 className="w-10 h-10 animate-spin text-olive-600 mb-4" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
          {t("common.loading")}
        </p>
      </div>
    );
  }

  if (errorInitial) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">{t("common.error")}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">{errorInitial}</p>
        <Link
          href="/manage"
          className="px-5 py-2.5 rounded-xl bg-olive-700 text-white font-bold text-sm shadow-md hover:bg-olive-600 transition-colors"
        >
          {t("studio.backToManager")}
        </Link>
      </div>
    );
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative w-full h-screen overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans"
    >
      {/* Full-Page Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-olive-950/80 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none border-4 border-dashed border-olive-400 animate-fade-in p-8 text-center">
          <div className="w-24 h-24 rounded-3xl bg-olive-600 text-white flex items-center justify-center shadow-2xl mb-5 animate-bounce">
            <Upload className="w-12 h-12" />
          </div>
          <h3 className="text-3xl font-extrabold text-white">
            {t("studio.dropzoneTitle")}
          </h3>
          <p className="text-base text-olive-200 mt-3 max-w-lg">
            {t("studio.dropzoneSub")}
          </p>
        </div>
      )}

      {/* TOP APPLICATION BAR */}
      <header className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between gap-4 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/manage"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t("studio.backToManager")}</span>
          </Link>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

          <div>
            <h1 className="text-base font-extrabold flex items-center gap-2">
              <span>{mode === "create" ? t("studio.createTitle") : t("studio.editTitle")}</span>
              {title && (
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400 truncate max-w-xs">
                  — {title}
                </span>
              )}
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>{photos.length} {t("manager.statsPhotos").toLowerCase()}</span>
              <span>•</span>
              <span>{spots.length} {t("manager.statsSpots").toLowerCase()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector />
          <ThemeToggle />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-olive-600 dark:text-olive-400" />
            <span>{t("studio.addPhotosBtn")}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />

          <button
            onClick={handleSave}
            disabled={submitting || photos.length === 0}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-95 cursor-pointer ${
              saveSuccess
                ? "bg-emerald-600 ring-2 ring-emerald-400"
                : "bg-olive-700 hover:bg-olive-600 disabled:opacity-50"
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{uploadProgress || t("studio.saving")}</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>{t("studio.saveSuccess")}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{mode === "create" ? t("studio.saveBtn") : t("studio.saveChangesBtn")}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* WORKSPACE: 2-COLUMN VIEWPORT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: Controls, Details & Spots list (45% width, scrollable) */}
        <div className="w-full lg:w-[45%] h-full overflow-y-auto p-6 space-y-6 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
          {/* Card 1: Trip Details & Multilingual Tabs */}
          <section className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-olive-800 dark:text-olive-400">
                {t("studio.tripSection")}
              </span>

              {/* Language Tabs */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                {(["ro", "en", "de", "es", "fr"] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveLangTab(lang)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                      activeLangTab === lang
                        ? "bg-olive-700 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <FlagIcon code={lang} className="w-3.5 h-2.5 inline mr-1" />
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs based on active language tab */}
            {activeLangTab === "ro" ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {t("studio.titleLabel")} (RO) *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("studio.titlePlaceholder")}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-olive-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {t("studio.descPlaceholder")} (RO)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("studio.descPlaceholder")}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-olive-500 resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {t("studio.titleLabel")} ({activeLangTab.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    value={translations[activeLangTab]?.title || ""}
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [activeLangTab]: { ...prev[activeLangTab], title: e.target.value },
                      }))
                    }
                    placeholder={`${t("studio.titleLabel")} in ${activeLangTab.toUpperCase()}...`}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-olive-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {t("studio.descPlaceholder")} ({activeLangTab.toUpperCase()})
                  </label>
                  <textarea
                    rows={2}
                    value={translations[activeLangTab]?.description || ""}
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [activeLangTab]: { ...prev[activeLangTab], description: e.target.value },
                      }))
                    }
                    placeholder={`${t("studio.descPlaceholder")} in ${activeLangTab.toUpperCase()}...`}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-olive-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Dates row + AI Translate CTA */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                    {t("studio.startDate")}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-olive-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                    {t("studio.endDate")}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-olive-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleTranslateAll}
                disabled={translating || !title.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-olive-100 hover:bg-olive-200 dark:bg-olive-900/30 dark:hover:bg-olive-900/50 text-olive-800 dark:text-olive-300 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {translating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>{translating ? t("studio.translating") : t("studio.translateBtn")}</span>
              </button>
            </div>

            {/* Partner Mode Toggle & Notes */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={withPartner}
                  onChange={(e) => setWithPartner(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                  {t("studio.partnerToggle")}
                </span>
              </label>

              {withPartner && (
                <div className="pl-6 animate-fade-in">
                  <textarea
                    rows={2}
                    value={partnerNotes}
                    onChange={(e) => setPartnerNotes(e.target.value)}
                    placeholder={t("studio.partnerNotes")}
                    className="w-full px-3 py-1.5 rounded-xl text-xs bg-rose-50/50 dark:bg-rose-950/20 text-rose-950 dark:text-rose-200 border border-rose-200 dark:border-rose-900/40 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Visibility Selector */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-400">
                {t("studio.globalVisibility")}:
              </span>
              <div className="flex items-center gap-1.5">
                {(["VIEWER", "CLOSE_FRIEND", "PARTNER"] as VisibilityRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setTripMinRole(role)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      tripMinRole === role
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {role === "VIEWER"
                      ? t("studio.rolePublic")
                      : role === "CLOSE_FRIEND"
                      ? t("studio.roleFriends")
                      : t("studio.rolePartner")}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Card 2: Multi-Drop File Upload Dropzone */}
          <section
            onClick={() => fileInputRef.current?.click()}
            className="p-6 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-olive-500 dark:hover:border-olive-400 bg-slate-50 dark:bg-slate-900/40 hover:bg-olive-50/30 dark:hover:bg-olive-950/20 transition-all cursor-pointer flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-2xl bg-olive-100 dark:bg-olive-900/40 text-olive-700 dark:text-olive-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              {t("studio.dropzoneTitle")}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              {t("studio.dropzoneSub")}
            </p>
            {processingFiles && (
              <div className="mt-3 flex items-center gap-2 text-xs font-bold text-olive-600 dark:text-olive-400 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Extragere GPS & clasare automată...</span>
              </div>
            )}
          </section>

          {/* Card 3: Unmapped Photos Shelf (if any) */}
          {unmappedPhotoIds.length > 0 && (
            <section className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-700/50 space-y-3 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-200 flex items-center justify-center font-black text-xs">
                    {unmappedPhotoIds.length}
                  </div>
                  <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                    {t("studio.unmappedPhotos")} ({unmappedPhotoIds.length})
                  </h4>
                </div>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300/90">
                {t("studio.unmappedInstructions")}
              </p>

              {/* Thumbnails row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {photos
                  .filter((p) => unmappedPhotoIds.includes(p.id))
                  .map((p) => (
                    <div
                      key={p.id}
                      className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-amber-300 dark:border-amber-700 group"
                    >
                      <img
                        src={p.previewUrl}
                        alt="Unmapped"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(p.id);
                        }}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-900/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Card 4: Detected Spots List */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t("studio.detectedSpots")} ({spots.length})
              </span>
            </div>

            {spots.length === 0 ? (
              <div className="p-8 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400 text-xs">
                Niciun punct detectat încă. Încarcă fotografii pentru a crea pin-uri automate!
              </div>
            ) : (
              <div className="space-y-3">
                {spots.map((spot, index) => {
                  const isSelected = spot.id === selectedSpotId;
                  const spotPhotos = photos.filter((p) => spot.photoIds.includes(p.id));

                  return (
                    <div
                      key={spot.id}
                      onClick={() => {
                        setSelectedSpotId(spot.id);
                        if (mapRef.current) {
                          mapRef.current.flyTo({
                            center: [spot.longitude, spot.latitude],
                            zoom: 14,
                          });
                        }
                      }}
                      className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-olive-50/70 dark:bg-olive-950/30 border-olive-500 ring-2 ring-olive-500/20 shadow-md"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-xl bg-olive-700 text-white font-black text-xs flex items-center justify-center">
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            value={spot.name}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const newName = e.target.value;
                              setSpots((prev) =>
                                prev.map((s) => (s.id === spot.id ? { ...s, name: newName } : s))
                              );
                              setPhotos((prev) =>
                                prev.map((p) =>
                                  spot.photoIds.includes(p.id) ? { ...p, spotName: newName } : p
                                )
                              );
                            }}
                            className="text-xs font-bold bg-transparent text-slate-900 dark:text-white border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-olive-500 focus:outline-none px-1"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold">
                            {spotPhotos.length} {t("manager.statsPhotos").toLowerCase()}
                          </span>
                        </div>
                      </div>

                      {/* Spot Thumbnails Preview */}
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 pt-1">
                        {spotPhotos.map((p) => (
                          <div
                            key={p.id}
                            className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group"
                          >
                            <img
                              src={p.previewUrl}
                              alt={spot.name}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePhoto(p.id);
                              }}
                              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-slate-900/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: Full MapLibre Interactive Map (55% width) */}
        <div className="w-full lg:w-[55%] h-full relative overflow-hidden bg-slate-100 dark:bg-slate-950">
          {/* Map Destination Search Bar */}
          <form
            onSubmit={handleMapSearch}
            className="absolute top-4 left-4 z-10 flex items-center gap-2 w-full max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800"
          >
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="text"
              value={mapSearchQuery}
              onChange={(e) => setMapSearchQuery(e.target.value)}
              placeholder={t("studio.searchMap")}
              className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={searchingLocation}
              className="px-3 py-1.5 rounded-xl bg-olive-700 hover:bg-olive-600 text-white text-xs font-bold shadow transition-colors cursor-pointer"
            >
              {searchingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("studio.searchGo")}
            </button>
          </form>

          {/* Draggable hint banner */}
          <div className="absolute bottom-4 left-4 z-10 px-3.5 py-1.5 rounded-xl bg-slate-900/85 text-white text-[11px] font-semibold backdrop-blur-md shadow-lg pointer-events-none flex items-center gap-1.5 border border-slate-700">
            <MapPin className="w-3.5 h-3.5 text-olive-400" />
            <span>{t("studio.dragHint")}</span>
          </div>

          {/* Actual Map Container */}
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}
