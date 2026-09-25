"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import maplibregl from "maplibre-gl";
import exifr from "exifr";
import {
  X,
  Upload,
  MapPin,
  Calendar,
  Lock,
  Globe2,
  Sparkles,
  Heart,
  Star,
  Eye,
  Shield,
  Layers,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { VisibilityRole } from "@/lib/types";
import { useModalA11y } from "@/hooks/useModalA11y";
import { FlagIcon } from "@/components/FlagIcon";
import { Language } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme";

const CARTO_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const CARTO_VOYAGER = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

interface PhotoItemDraft {
  id: string;
  file: File;
  previewUrl: string;
  latitude: number | null;
  longitude: number | null;
  takenAt: string;
  spotName: string;
  spotDescription?: string;
  caption?: string;
  minRole: VisibilityRole;
  isPrivate: boolean;
  hasPeople: boolean;
  isCountryCover: boolean;
  partnerPreselected: boolean;
}

interface SpotGroup {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  minRole: VisibilityRole;
  photoIds: string[];
}

interface BulkUploadStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: () => void;
}

export function BulkUploadStudioModal({
  isOpen,
  onClose,
  onTripCreated,
}: BulkUploadStudioModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  // Trip basic info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [withPartner, setWithPartner] = useState(false);
  const [partnerNotes, setPartnerNotes] = useState("");
  const [tripMinRole, setTripMinRole] = useState<VisibilityRole>("VIEWER");

  // Keep fresh references for map event handlers
  const titleRef = useRef(title);
  const withPartnerRef = useRef(withPartner);
  const spotsRef = useRef<SpotGroup[]>([]);
  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { withPartnerRef.current = withPartner; }, [withPartner]);

  // Multilingual translations
  const [activeLangTab, setActiveLangTab] = useState<Language>("ro");
  const [translations, setTranslations] = useState<Record<string, { title: string; description: string }>>({
    en: { title: "", description: "" },
    de: { title: "", description: "" },
    es: { title: "", description: "" },
    fr: { title: "", description: "" },
  });
  const [translating, setTranslating] = useState(false);

  // Photos & Spots
  const [photos, setPhotos] = useState<PhotoItemDraft[]>([]);
  const [spots, setSpots] = useState<SpotGroup[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [unmappedPhotoIds, setUnmappedPhotoIds] = useState<string[]>([]);
  const [activePhotoForEdit, setActivePhotoForEdit] = useState<PhotoItemDraft | null>(null);
  const unmappedPhotos = useMemo(
    () => photos.filter((p) => unmappedPhotoIds.includes(p.id)),
    [photos, unmappedPhotoIds]
  );
  useEffect(() => { spotsRef.current = spots; }, [spots]);

  // Map location search
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [searchingLocation, setSearchingLocation] = useState(false);

  // Processing & progress
  const [processingFiles, setProcessingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset entire draft state
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("");
    setWithPartner(false);
    setPartnerNotes("");
    setTripMinRole("VIEWER");
    setTranslations({
      en: { title: "", description: "" },
      de: { title: "", description: "" },
      es: { title: "", description: "" },
      fr: { title: "", description: "" },
    });
    setPhotos([]);
    setSpots([]);
    setUnmappedPhotoIds([]);
    setSelectedSpotId(null);
    setActivePhotoForEdit(null);
  };

  // Safe Close Handlers - Prevent Accidental Loss of Uploads / Work
  const handleClosePrompt = () => {
    if (photos.length > 0 || title.trim().length > 0) {
      if (window.confirm("Sigur dorești să închizi fereastra? Progresul tău este păstrat în memorie până finalizezi sau apeși pe Anulează.")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    if (photos.length > 0 || title.trim().length > 0) {
      if (window.confirm("Sigur dorești să anulezi? Toate fotografiile și datele introduse vor fi șterse.")) {
        resetForm();
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    handleClosePrompt();
  };

  useModalA11y({ isOpen, onClose: handleClosePrompt, modalRef });

  // Resize MapLibre whenever modal becomes visible
  useEffect(() => {
    if (isOpen && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.resize();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Remove individual photo
  const handleRemovePhoto = (photoId: string) => {
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
    if (activePhotoForEdit?.id === photoId) {
      setActivePhotoForEdit(null);
    }
  };

  // Assign all unmapped photos to the current center of the mini-map
  const handleAssignUnmappedToMapCenter = () => {
    if (unmappedPhotoIds.length === 0) return;
    const center = mapRef.current?.getCenter() || { lng: 24.12, lat: 45.79 };
    const lat = center.lat;
    const lng = center.lng;

    const newSpotId = `spot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const defaultName = titleRef.current.trim()
      ? titleRef.current.trim()
      : `Punct Foto ${spots.length + 1}`;

    const newSpot: SpotGroup = {
      id: newSpotId,
      name: defaultName,
      description: "",
      latitude: lat,
      longitude: lng,
      minRole: withPartnerRef.current ? "PARTNER" : "VIEWER",
      photoIds: [...unmappedPhotoIds],
    };

    setSpots((prev) => [...prev, newSpot]);
    setPhotos((prev) =>
      prev.map((p) =>
        unmappedPhotoIds.includes(p.id)
          ? { ...p, latitude: lat, longitude: lng, spotName: defaultName }
          : p
      )
    );
    setSelectedSpotId(newSpotId);
    setUnmappedPhotoIds([]);

    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 11 });
    }
  };

  // Geocode location search
  const handleSearchLocation = async (query: string) => {
    if (!query.trim() || !mapRef.current) return;
    setSearchingLocation(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        mapRef.current.flyTo({ center: [lon, lat], zoom: 11, essential: true });
      } else {
        alert("Locația căutată nu a fost găsită. Încearcă un alt nume de oraș sau insulă.");
      }
    } catch (err) {
      console.warn("Geocoding request failed:", err);
    } finally {
      setSearchingLocation(false);
    }
  };

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // Prevent default browser drag/drop behavior on window so dropping files outside specific elements doesn't open in new tabs!
  useEffect(() => {
    if (!isOpen) return;
    const preventWindowDrop = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener("dragover", preventWindowDrop);
    window.addEventListener("drop", preventWindowDrop);
    return () => {
      window.removeEventListener("dragover", preventWindowDrop);
      window.removeEventListener("drop", preventWindowDrop);
    };
  }, [isOpen]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
    if (!isDragging) setIsDragging(true);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  // =========================================================================
  // 1. FILE IMPORT & EXIF SPOT CLUSTERING
  // =========================================================================
  const handleFilesSelected = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setProcessingFiles(true);

    const filesArray = Array.from(files);
    const newDrafts: PhotoItemDraft[] = [];
    const newUnmapped: string[] = [];

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      const previewUrl = URL.createObjectURL(file);
      const photoId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      let lat: number | null = null;
      let lon: number | null = null;
      let takenAt = new Date().toISOString();

      try {
        const exifData = await exifr.parse(file, [
          "latitude",
          "longitude",
          "DateTimeOriginal",
          "CreateDate",
        ]);

        if (exifData?.latitude && exifData?.longitude) {
          lat = Number(exifData.latitude);
          lon = Number(exifData.longitude);
        }
        if (exifData?.DateTimeOriginal || exifData?.CreateDate) {
          const d = new Date(exifData.DateTimeOriginal || exifData.CreateDate);
          if (!isNaN(d.getTime())) takenAt = d.toISOString();
        }
      } catch (err) {
        console.warn("Could not parse EXIF for file:", file.name, err);
      }

      const draft: PhotoItemDraft = {
        id: photoId,
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
      if (!lat || !lon) {
        newUnmapped.push(photoId);
      }
    }

    // Auto-cluster mapped photos into Spots (photos within ~100m)
    const updatedSpots = [...spots];

    newDrafts.forEach((draft) => {
      if (!draft.latitude || !draft.longitude) return;

      // Find nearby spot
      const matched = updatedSpots.find((s) => {
        const dLat = Math.abs(s.latitude - draft.latitude!);
        const dLon = Math.abs(s.longitude - draft.longitude!);
        return dLat < 0.0015 && dLon < 0.0015; // ~100-150 meters
      });

      if (matched) {
        matched.photoIds.push(draft.id);
        draft.spotName = matched.name;
      } else {
        const newSpotId = `spot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const defaultName = `Locație ${updatedSpots.length + 1}`;
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

    // If first spots detected, center map on first spot
    if (updatedSpots.length > 0 && mapRef.current) {
      const first = updatedSpots[0];
      mapRef.current.flyTo({ center: [first.longitude, first.latitude], zoom: 12 });
      setSelectedSpotId(first.id);
    }
  };

  // =========================================================================
  // 2. MINI-MAP INITIALIZATION & DRAGGABLE PINS
  // =========================================================================
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: CARTO_VOYAGER,
      center: [24.12, 45.79],
      zoom: 6,
      minZoom: 2.5,
      maxZoom: 18,
    });

    const navControl = new maplibregl.NavigationControl({
      showCompass: true,
      visualizePitch: true,
    });
    map.addControl(navControl, "top-right");

    map.on("load", () => {
      mapRef.current = map;
      // Click on map to assign unmapped photos
      map.on("click", (e) => {
        const { lng, lat } = e.lngLat;
        // If there are unmapped photos, assign them to a new spot at click coordinates
        setUnmappedPhotoIds((currentUnmapped) => {
          if (currentUnmapped.length === 0) return currentUnmapped;

          const newSpotId = `spot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const defaultName = titleRef.current.trim()
            ? titleRef.current.trim()
            : `Punct Foto ${spotsRef.current.length + 1}`;

          setSpots((prevSpots) => [
            ...prevSpots,
            {
              id: newSpotId,
              name: defaultName,
              description: "",
              latitude: lat,
              longitude: lng,
              minRole: withPartnerRef.current ? "PARTNER" : "VIEWER",
              photoIds: [...currentUnmapped],
            },
          ]);

          setPhotos((prevPhotos) =>
            prevPhotos.map((p) =>
              currentUnmapped.includes(p.id)
                ? { ...p, latitude: lat, longitude: lng, spotName: defaultName }
                : p
            )
          );

          setSelectedSpotId(newSpotId);
          return []; // Cleared unmapped
        });
      });
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync Draggable Markers with Spots
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove markers that no longer exist
    const currentSpotIds = new Set(spots.map((s) => s.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentSpotIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add or update markers
    spots.forEach((spot) => {
      const isSelected = spot.id === selectedSpotId;

      if (markersRef.current.has(spot.id)) {
        const existing = markersRef.current.get(spot.id)!;
        existing.setLngLat([spot.longitude, spot.latitude]);
        return;
      }

      // Create custom draggable marker element
      const el = document.createElement("div");
      el.className = "cursor-grab active:cursor-grabbing group";
      el.innerHTML = `
        <div class="relative flex items-center justify-center transition-transform hover:scale-120">
          <div class="w-8 h-8 rounded-full border-2 ${isSelected ? "border-amber-400 bg-amber-600" : "border-olive-400 bg-olive-700"} text-white flex items-center justify-center font-bold text-xs shadow-lg">
            ${spot.photoIds.length}
          </div>
          <div class="absolute -bottom-5 px-2 py-0.5 rounded-md bg-slate-900/90 text-[10px] text-white font-semibold whitespace-nowrap shadow-md border border-slate-700 pointer-events-none">
            ${spot.name}
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([spot.longitude, spot.latitude])
        .addTo(mapRef.current!);

      // On Drag End: update spot and all its photos coordinates in real time!
      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        setSpots((prev) =>
          prev.map((s) => (s.id === spot.id ? { ...s, latitude: lngLat.lat, longitude: lngLat.lng } : s))
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
  }, [spots, selectedSpotId]);

  // =========================================================================
  // 3. BATCH ACTIONS & SPOT EDITS
  // =========================================================================
  const applyRoleToSpot = (spotId: string, role: VisibilityRole) => {
    setSpots((prev) =>
      prev.map((s) => (s.id === spotId ? { ...s, minRole: role } : s))
    );
    const targetSpot = spots.find((s) => s.id === spotId);
    if (!targetSpot) return;

    setPhotos((prev) =>
      prev.map((p) =>
        targetSpot.photoIds.includes(p.id)
          ? {
              ...p,
              minRole: role,
              isPrivate: role === "ADMIN",
              partnerPreselected: role === "PARTNER",
            }
          : p
      )
    );
  };

  const applyRoleToAllSpots = (role: VisibilityRole) => {
    setSpots((prev) => prev.map((s) => ({ ...s, minRole: role })));
    setPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        minRole: role,
        isPrivate: role === "ADMIN",
        partnerPreselected: role === "PARTNER",
      }))
    );
  };

  // AI Multilingual Translation
  const handleTranslateAll = async () => {
    if (!title) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          all: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.translations) {
        setTranslations(data.translations);
      }
    } catch (err) {
      console.error("AI translation error:", err);
    } finally {
      setTranslating(false);
    }
  };

  // =========================================================================
  // 4. SUBMIT BATCH UPLOAD & TRIP CREATION
  // =========================================================================
  const handleSubmit = async () => {
    if (!title || !startDate) {
      alert("Te rugăm să completezi titlul și data călătoriei.");
      return;
    }
    if (photos.length === 0) {
      alert("Adaugă cel puțin o fotografie.");
      return;
    }

    setSubmitting(true);
    setUploadProgress("Se pregătesc imaginile...");

    try {
      // 1. Upload images in chunks of 15 files
      const CHUNK_SIZE = 15;
      const uploadedResults: any[] = [];

      for (let i = 0; i < photos.length; i += CHUNK_SIZE) {
        const chunk = photos.slice(i, i + CHUNK_SIZE);
        setUploadProgress(`Se optimizează WebP ${i + 1}-${Math.min(i + CHUNK_SIZE, photos.length)} din ${photos.length} imagini...`);

        const formData = new FormData();
        chunk.forEach((p) => {
          formData.append("files", p.file);
        });

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Eroare la încărcarea fotografiilor");
        }

        const items = uploadData.uploads || [uploadData];
        uploadedResults.push(...items);
      }

      // 2. Prepare structured photos payload
      setUploadProgress("Se creează călătoria și se generează Atlasul...");

      const payloadPhotos = photos.map((p, idx) => {
        const uploaded = uploadedResults[idx] || {};
        const spot = spots.find((s) => s.photoIds.includes(p.id));

        return {
          url: uploaded.url,
          thumbnailUrl: uploaded.thumbnailUrl || uploaded.url,
          originalUrl: uploaded.originalUrl || uploaded.url,
          latitude: p.latitude || spot?.latitude || 0,
          longitude: p.longitude || spot?.longitude || 0,
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

      // 3. Post to /api/trips
      const primarySpot = spots[0];
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
        throw new Error(errData.error || "Eroare la salvarea călătoriei");
      }

      resetForm();
      onTripCreated();
      onClose();
    } catch (err: any) {
      console.error("Batch creation failed:", err);
      alert(err.message || "A apărut o problemă la salvare.");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-studio-title"
      aria-hidden={!isOpen}
      className={
        isOpen
          ? "fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-md animate-fade-in"
          : "hidden"
      }
      onClick={handleBackdropClick}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative w-full max-w-7xl h-[94vh] rounded-3xl border border-slate-200 dark:border-olive-500/30 overflow-hidden flex flex-col shadow-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
      >
        {/* Full-Modal Drag & Drop Visual Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-olive-950/75 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none border-4 border-dashed border-olive-400 rounded-3xl animate-fade-in p-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-olive-600 text-white flex items-center justify-center shadow-2xl mb-4 animate-bounce">
              <Upload className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-white shadow-sm">
              Dă drumul fotografiilor aici!
            </h3>
            <p className="text-sm text-olive-200 mt-2 max-w-md">
              Vom extrage automat coordonatele GPS și data fiecărei fotografii pentru a crea pin-urile pe hartă.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-olive-500/20 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-olive-700 text-white flex items-center justify-center shadow-md">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 id="bulk-studio-title" className="text-base sm:text-lg font-bold">Studio Curare & Upload Spatial</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {photos.length} fotografii • {spots.length} puncte pe hartă
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label="Adaugă imagini prin încărcare multiplă"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-olive-700 hover:bg-olive-600 text-white text-xs font-bold transition-all shadow-md active:scale-95 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adaugă Imagini (Multi-Drop)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              aria-label="Selectează fotografii de pe dispozitiv"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />

            <button
              onClick={handleClosePrompt}
              aria-label="Închide fereastra de upload"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Split Screen Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* =========================================================================
              LEFT PANEL: Trip Info, Spots List, and Photo Grids
              ========================================================================= */}
          <div className="w-full lg:w-1/2 flex flex-col border-r border-slate-200 dark:border-olive-500/20 overflow-y-auto p-5 space-y-5 bg-white dark:bg-slate-900">
            {/* Trip Details Box */}
            <div className="space-y-3 p-4 rounded-2xl bg-olive-50/70 dark:bg-olive-950/30 border border-olive-200 dark:border-olive-500/25">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-olive-800 dark:text-olive-300">
                  Date Călătorie & Album
                </span>

                {/* Multilingual Selector */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  {(["ro", "en", "de", "es", "fr"] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveLangTab(lang)}
                      aria-label={`Comută la limba ${lang.toUpperCase()}`}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none ${
                        activeLangTab === lang
                          ? "bg-olive-700 text-white"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <FlagIcon code={lang} className="w-3.5 h-2.5 inline mr-1" />
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {activeLangTab === "ro" ? (
                <>
                  <input
                    type="text"
                    aria-label="Titlul călătoriei"
                    placeholder="Titlu Călătorie (ex: Expediție Toscana & Coasta Amalfi)..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-olive-500"
                  />
                  <textarea
                    aria-label="Descriere generală călătorie"
                    placeholder="Descriere generală sau notițe..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-olive-500 resize-none"
                  />
                </>
              ) : (
                <>
                  <input
                    type="text"
                    aria-label={`Titlul călătoriei în ${activeLangTab.toUpperCase()}`}
                    placeholder={`Titlu în ${activeLangTab.toUpperCase()}...`}
                    value={translations[activeLangTab]?.title || ""}
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [activeLangTab]: { ...prev[activeLangTab], title: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl text-sm font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-olive-500"
                  />
                  <textarea
                    aria-label={`Descrierea călătoriei în ${activeLangTab.toUpperCase()}`}
                    placeholder={`Descriere în ${activeLangTab.toUpperCase()}...`}
                    value={translations[activeLangTab]?.description || ""}
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [activeLangTab]: { ...prev[activeLangTab], description: e.target.value },
                      }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-olive-500 resize-none"
                  />
                </>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    aria-label="Data de început a călătoriei"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2 py-1 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-olive-500"
                  />
                  <span className="text-xs text-slate-400">până la</span>
                  <input
                    type="date"
                    aria-label="Data de sfârșit a călătoriei"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2 py-1 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-olive-500"
                  />
                </div>

                <button
                  onClick={handleTranslateAll}
                  disabled={translating || !title}
                  aria-label="Tradu automat titlul și descrierea în 4 limbi utilizând Gemini AI"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-olive-100 hover:bg-olive-200 dark:bg-olive-600/20 dark:hover:bg-olive-600/30 text-olive-800 dark:text-olive-300 text-xs font-bold transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{translating ? "Se traduce..." : "Tradu cu AI în 4 Limbi"}</span>
                </button>
              </div>

              {/* Partner Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-olive-200 dark:border-olive-500/20">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={withPartner}
                    onChange={(e) => setWithPartner(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-xs font-bold flex items-center gap-1 text-rose-700 dark:text-rose-300">
                    <Heart className="w-3.5 h-3.5 fill-rose-500" />
                    Călătorie în doi cu partenerul
                  </span>
                </label>

                {withPartner && (
                  <button
                    onClick={() => applyRoleToAllSpots("PARTNER")}
                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    Setează toate pozele pe Partener
                  </button>
                )}
              </div>
            </div>

            {/* Batch Visibility Toolbar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Setare Vizibilitate Globală:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => applyRoleToAllSpots("PUBLIC")}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-olive-500/20 transition-colors"
                >
                  Public
                </button>
                <button
                  onClick={() => applyRoleToAllSpots("CLOSE_FRIEND")}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-500/20 border border-amber-300/40 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"
                >
                  Prieteni
                </button>
                {withPartner && (
                  <button
                    onClick={() => applyRoleToAllSpots("PARTNER")}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-100 dark:bg-rose-500/20 border border-rose-300/40 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 hover:bg-rose-200 dark:hover:bg-rose-500/30 transition-colors"
                  >
                    În Doi
                  </button>
                )}
              </div>
            </div>

            {/* Unmapped Photos Section with Thumbnails & Quick Actions */}
            {unmappedPhotoIds.length > 0 && (
              <div className="p-4 rounded-3xl bg-amber-50/90 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/30 space-y-3 shadow-md animate-fade-in">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-200 flex items-center justify-center font-extrabold text-xs">
                      {unmappedPhotoIds.length}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                        Fotografii fără coordonate GPS ({unmappedPhotoIds.length})
                      </h4>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300/80">
                        Apasă pe oricare fotografie pentru detalii, sau grupează-le pe hartă:
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAssignUnmappedToMapCenter}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    title="Creează un pin la locația vizibilă în centrul hărții"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Fixează toate în centrul hărții</span>
                  </button>
                </div>

                {/* Grid of Unmapped Photo Previews */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1.5 border border-amber-200 dark:border-amber-500/20 rounded-2xl bg-white/70 dark:bg-slate-900/70">
                  {unmappedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-amber-500 shadow-xs bg-slate-950"
                      onClick={() => setActivePhotoForEdit(photo)}
                    >
                      <img
                        src={photo.previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {/* Hover action overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePhotoForEdit(photo);
                          }}
                          className="p-1 rounded-lg bg-white/90 text-slate-800 hover:bg-white transition-colors cursor-pointer"
                          title="Editează detalii poză"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePhoto(photo.id);
                          }}
                          className="p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                          title="Elimină fotografia"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                  <span>
                    💡 <strong className="text-amber-700 dark:text-amber-300">Sfat:</strong> Poți căuta destinația în căutarea de pe hartă și apoi apăsa pe <em>"Fixează toate în centrul hărții"</em> sau da click pe hartă.
                  </span>
                </div>
              </div>
            )}

            {/* Spots Accordion List */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Puncte & Pin-uri Detectate ({spots.length})
              </h3>

              {photos.length === 0 ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  aria-label="Apasă sau trage fișiere pentru a încărca fotografii"
                  className={`py-14 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-6 transition-all duration-200 cursor-pointer group select-none ${
                    isDragging
                      ? "border-olive-500 bg-olive-100/60 dark:bg-olive-950/50 ring-4 ring-olive-500/20 scale-[1.01]"
                      : "border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-olive-500 hover:bg-olive-50/60 dark:hover:bg-olive-950/30 shadow-xs"
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-olive-100 dark:bg-olive-900/50 text-olive-700 dark:text-olive-300 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 group-hover:bg-olive-700 group-hover:text-white transition-all">
                    <Upload className="w-7 h-7" />
                  </div>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-olive-700 dark:group-hover:text-olive-300 transition-colors">
                    {isDragging ? "Dă drumul fotografiilor aici!" : "Nicio fotografie adăugată"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
                    Trage sau <span className="text-olive-700 dark:text-olive-400 font-bold underline underline-offset-2">apasă aici pentru a selecta</span> fotografii de pe cameră / telefon. Datele GPS le vor grupa automat pe hartă!
                  </p>
                  <div className="mt-4 px-4 py-1.5 rounded-full bg-olive-700 hover:bg-olive-600 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    <span>Selectează Fotografii</span>
                  </div>
                </div>
              ) : spots.length === 0 ? (
                <div className="p-6 rounded-3xl border border-dashed border-amber-300 dark:border-amber-500/40 bg-amber-50/40 dark:bg-amber-500/5 text-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Toate cele {photos.length} fotografii sunt încărcate!
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Apasă pe butonul <strong className="text-amber-700 dark:text-amber-300">"Fixează toate în centrul hărții"</strong> de mai sus sau dă click oriunde pe harta din dreapta pentru a crea pin-ul acestora.
                  </p>
                </div>
              ) : (
                spots.map((spot, sIdx) => {
                  const isSelected = spot.id === selectedSpotId;
                  const spotPhotos = photos.filter((p) => spot.photoIds.includes(p.id));

                  return (
                    <div
                      key={spot.id}
                      className={`p-4 rounded-3xl border transition-all duration-200 ${
                        isSelected
                          ? "border-olive-500 bg-olive-50/70 dark:bg-olive-500/10 shadow-lg ring-1 ring-olive-500/30"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60"
                      }`}
                    >
                      {/* Spot Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1 mr-3">
                          <button
                            onClick={() => {
                              setSelectedSpotId(spot.id);
                              if (mapRef.current) {
                                mapRef.current.flyTo({ center: [spot.longitude, spot.latitude], zoom: 14 });
                              }
                            }}
                            className="w-7 h-7 rounded-xl bg-olive-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm"
                          >
                            {sIdx + 1}
                          </button>
                          <input
                            type="text"
                            value={spot.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSpots((prev) =>
                                prev.map((s) => (s.id === spot.id ? { ...s, name: val } : s))
                              );
                              setPhotos((prev) =>
                                prev.map((p) => (spot.photoIds.includes(p.id) ? { ...p, spotName: val } : p))
                              );
                            }}
                            placeholder="Nume Locație / Spot..."
                            className="font-bold text-sm bg-transparent text-slate-900 dark:text-white border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-olive-500 focus:outline-none flex-1 truncate"
                          />
                        </div>

                        {/* Visibility Pill for Spot */}
                        <div className="flex items-center gap-1">
                          {(["PUBLIC", "CLOSE_FRIEND", "PARTNER"] as VisibilityRole[]).map((r) => (
                            <button
                              key={r}
                              onClick={() => applyRoleToSpot(spot.id, r)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                                spot.minRole === r
                                  ? r === "PARTNER"
                                    ? "bg-rose-600 text-white"
                                    : r === "CLOSE_FRIEND"
                                    ? "bg-amber-600 text-white"
                                    : "bg-olive-700 text-white"
                                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              {r === "PARTNER" ? "În Doi" : r === "CLOSE_FRIEND" ? "Prieteni" : "Public"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Optional Spot Description */}
                      <input
                        type="text"
                        value={spot.description}
                        onChange={(e) =>
                          setSpots((prev) =>
                            prev.map((s) => (s.id === spot.id ? { ...s, description: e.target.value } : s))
                          )
                        }
                        placeholder="Adaugă o notă pentru tot grupul (opțional)..."
                        className="w-full text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-slate-200 dark:border-slate-800 focus:border-olive-500 focus:outline-none mb-3 pb-1"
                      />

                      {/* Photo Thumbnails Grid in Spot */}
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {spotPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            onClick={() => setActivePhotoForEdit(photo)}
                            className="relative aspect-square rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 cursor-pointer group bg-slate-900"
                          >
                            <img
                              src={photo.previewUrl}
                              alt=""
                              className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            />
                            {photo.caption && (
                              <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 px-1 py-0.5 text-[8px] text-white truncate">
                                {photo.caption}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}

              {spots.length > 0 && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  aria-label="Adaugă mai multe fotografii"
                  className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-olive-500 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-olive-700 dark:hover:text-olive-300 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-olive-50/50 dark:hover:bg-olive-950/30 transition-all cursor-pointer group"
                >
                  <Plus className="w-4 h-4 text-olive-600 dark:text-olive-400 group-hover:scale-125 transition-transform" />
                  <span>Trage mai multe poze aici sau apasă pentru a adăuga</span>
                </div>
              )}
            </div>
          </div>

          {/* =========================================================================
              RIGHT PANEL: Interactive Mini-Map for Pin Dragging & Geographic Positioning
              ========================================================================= */}
          <div
            role="region"
            aria-label="Mini-hartă interactivă pentru poziționarea și ajustarea spoturilor pe hartă"
            className="w-full lg:w-1/2 h-64 lg:h-full relative bg-slate-100 dark:bg-slate-950 overflow-hidden"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Destination Quick Search */}
            <div className="absolute top-3 left-3 right-16 z-20 flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Caută destinație pe hartă (ex: Gran Canaria)..."
                  value={mapSearchQuery}
                  onChange={(e) => setMapSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearchLocation(mapSearchQuery);
                    }
                  }}
                  className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs font-medium bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 shadow-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSearchLocation(mapSearchQuery)}
                disabled={searchingLocation}
                className="px-3.5 py-1.5 rounded-full bg-olive-700 hover:bg-olive-600 text-white text-xs font-bold shadow-md transition-all shrink-0 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {searchingLocation ? "..." : "Mergi"}
              </button>
            </div>

            {/* Map Overlay Instructions */}
            <div className="absolute bottom-6 left-3 z-10 glass-panel px-3 py-1.5 rounded-full border border-olive-500/30 text-[11px] font-semibold text-slate-800 dark:text-white shadow-md flex items-center gap-1.5 pointer-events-none">
              <MapPin className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400" />
              <span>Trage pin-urile pe hartă sau apasă pe hartă pentru a fixa un spot</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-olive-500/20 bg-slate-50/90 dark:bg-slate-900/90">
          <div>
            {uploadProgress ? (
              <p
                role="status"
                aria-live="polite"
                className="text-xs font-bold text-olive-600 dark:text-olive-400 animate-pulse"
              >
                {uploadProgress}
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {photos.length} fotografii vor fi convertite automat în WebP optimizat
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              disabled={submitting}
              aria-label="Anulează procesul și închide fereastra"
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none cursor-pointer"
            >
              Anulează
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || photos.length === 0}
              aria-label="Publică călătoria și fotografiile în atlas"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-olive-700 hover:bg-olive-600 text-white text-xs font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Se publică...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Publică Călătoria & Actualizează Atlasul</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal for Single Photo Caption / Override */}
        {activePhotoForEdit && (
          <div
            className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setActivePhotoForEdit(null)}
          >
            <div
              className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-olive-500/30 p-5 bg-white dark:bg-slate-900 shadow-2xl space-y-4 text-slate-900 dark:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold">Editează Detalii Fotografie</h4>
                <button
                  onClick={() => setActivePhotoForEdit(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
                <img src={activePhotoForEdit.previewUrl} alt="" className="w-full h-full object-contain" />
              </div>

              {/* GPS status pill & quick map assign */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs">
                {activePhotoForEdit.latitude && activePhotoForEdit.longitude ? (
                  <div className="flex items-center gap-1.5 text-olive-700 dark:text-olive-300 font-semibold truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>GPS: {activePhotoForEdit.latitude.toFixed(4)}, {activePhotoForEdit.longitude.toFixed(4)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Fără GPS</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const center = mapRef.current?.getCenter() || { lng: 24.12, lat: 45.79 };
                    const lat = center.lat;
                    const lng = center.lng;
                    setPhotos((prev) =>
                      prev.map((p) =>
                        p.id === activePhotoForEdit.id
                          ? { ...p, latitude: lat, longitude: lng }
                          : p
                      )
                    );
                    setActivePhotoForEdit((prev) =>
                      prev ? { ...prev, latitude: lat, longitude: lng } : null
                    );
                    setUnmappedPhotoIds((prev) => prev.filter((id) => id !== activePhotoForEdit.id));
                    const targetSpot = spots.find(
                      (s) => Math.abs(s.latitude - lat) < 0.005 && Math.abs(s.longitude - lng) < 0.005
                    );
                    if (targetSpot) {
                      setSpots((prev) =>
                        prev.map((s) => (s.id === targetSpot.id ? { ...s, photoIds: [...s.photoIds, activePhotoForEdit.id] } : s))
                      );
                    } else {
                      const newSpotId = `spot-${Date.now()}`;
                      setSpots((prev) => [
                        ...prev,
                        {
                          id: newSpotId,
                          name: titleRef.current.trim() || `Punct Foto ${spots.length + 1}`,
                          description: "",
                          latitude: lat,
                          longitude: lng,
                          minRole: withPartnerRef.current ? "PARTNER" : "VIEWER",
                          photoIds: [activePhotoForEdit.id],
                        },
                      ]);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-olive-700 hover:bg-olive-600 text-white text-[11px] font-bold shadow-xs shrink-0 cursor-pointer"
                >
                  Setează la centrul hărții
                </button>
              </div>

              <input
                type="text"
                placeholder="Titlu sau descriere specifică pentru această poză..."
                value={activePhotoForEdit.caption || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setActivePhotoForEdit((prev) => (prev ? { ...prev, caption: val } : null));
                  setPhotos((prev) =>
                    prev.map((p) => (p.id === activePhotoForEdit.id ? { ...p, caption: val } : p))
                  );
                }}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={activePhotoForEdit.partnerPreselected}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setActivePhotoForEdit((prev) => (prev ? { ...prev, partnerPreselected: checked } : null));
                      setPhotos((prev) =>
                        prev.map((p) => (p.id === activePhotoForEdit.id ? { ...p, partnerPreselected: checked } : p))
                      );
                    }}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Poză Specială În Doi</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(activePhotoForEdit.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Șterge</span>
                  </button>
                  <button
                    onClick={() => setActivePhotoForEdit(null)}
                    className="px-4 py-1.5 rounded-xl bg-olive-700 text-white text-xs font-bold hover:bg-olive-600 cursor-pointer"
                  >
                    Gata
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
