"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Upload,
  MapPin,
  Calendar,
  Lock,
  Globe2,
  Sparkles,
  UserCheck,
  Tag,
  AlertCircle,
  CheckCircle2,
  Search,
  Users,
  Image as ImageIcon,
  Loader2,
  Heart,
  Star,
  Eye,
  Shield,
} from "lucide-react";
import exifr from "exifr";
import { AILocationSuggestion, VisibilityRole } from "@/lib/types";
import { useModalA11y } from "@/hooks/useModalA11y";
import { FlagIcon } from "@/components/FlagIcon";
import { Language } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/context";

interface RegisteredUser {
  id: string;
  name: string;
  email: string;
}

interface PhotoDraft {
  file: File;
  previewUrl: string;
  latitude: number | null;
  longitude: number | null;
  placeName: string;
  city: string;
  country: string;
  takenAt: string;
  hasPeople: boolean;
  isPrivate: boolean;
  minRole: VisibilityRole;
  isCountryCover: boolean;
  partnerPreselected: boolean;
  tags: string[];
  aiSuggestions: AILocationSuggestion[];
  scanningAi: boolean;
  aiReasoning?: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: () => void;
}

export function UploadModal({ isOpen, onClose, onTripCreated }: UploadModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useModalA11y({ isOpen, onClose, modalRef });

  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activeLangTab, setActiveLangTab] = useState<Language>("ro");
  const [translations, setTranslations] = useState<Record<string, { title: string; description: string }>>({
    en: { title: "", description: "" },
    de: { title: "", description: "" },
    es: { title: "", description: "" },
    fr: { title: "", description: "" },
  });
  const [translatingLang, setTranslatingLang] = useState<string | null>(null);
  const [translateStatus, setTranslateStatus] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [withPartner, setWithPartner] = useState(false);
  const [partnerNotes, setPartnerNotes] = useState("");
  const [tripMinRole, setTripMinRole] = useState<VisibilityRole>("VIEWER");
  const [isTripPrivate, setIsTripPrivate] = useState(false);

  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const [manualSearching, setManualSearching] = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const cocoModelRef = useRef<any>(null);

  // Load available registered users
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/users")
      .then((res) => (res.ok ? res.json() : { users: [] }))
      .then((data) => setRegisteredUsers(data.users || []))
      .catch(() => {});
  }, [isOpen]);

  // Load TensorFlow COCO-SSD model dynamically in client for person detection
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function loadCoco() {
      try {
        if (!cocoModelRef.current) {
          const tf = await import("@tensorflow/tfjs");
          await tf.ready();
          const cocoSsd = await import("@tensorflow-models/coco-ssd");
          const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
          if (isMounted) {
            cocoModelRef.current = model;
          }
        }
      } catch (err) {
        console.warn("TensorFlow COCO-SSD client load fallback:", err);
      }
    }

    loadCoco();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle batch file selection and EXIF extraction
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newDrafts: PhotoDraft[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);

      const draft: PhotoDraft = {
        file,
        previewUrl,
        latitude: null,
        longitude: null,
        placeName: "",
        city: "",
        country: "",
        takenAt: new Date().toISOString(),
        hasPeople: false,
        isPrivate: false,
        minRole: "VIEWER",
        isCountryCover: false,
        partnerPreselected: false,
        tags: [],
        aiSuggestions: [],
        scanningAi: true,
      };

      // 1. Try parsing EXIF GPS and Date
      try {
        const exifData = await exifr.parse(file, {
          gps: true,
          tiff: true,
          pick: ["latitude", "longitude", "DateTimeOriginal", "CreateDate"],
        });

        if (exifData) {
          if (typeof exifData.latitude === "number" && typeof exifData.longitude === "number") {
            draft.latitude = exifData.latitude;
            draft.longitude = exifData.longitude;
          }
          if (exifData.DateTimeOriginal || exifData.CreateDate) {
            const date = new Date(exifData.DateTimeOriginal || exifData.CreateDate);
            if (!isNaN(date.getTime())) {
              draft.takenAt = date.toISOString();
            }
          }
        }
      } catch (exifErr) {
        console.warn("EXIF read error:", exifErr);
      }

      // If we have GPS coordinates, get reverse geocoded place name
      if (draft.latitude && draft.longitude) {
        try {
          const res = await fetch("/api/ai/suggest-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: draft.latitude, lon: draft.longitude }),
          });
          const geoData = await res.json();
          if (geoData.location) {
            draft.placeName = geoData.location.placeName;
            draft.city = geoData.location.city;
            draft.country = geoData.location.country;
          }
        } catch {}
      }

      newDrafts.push(draft);
    }

    const startIndex = photos.length;
    setPhotos((prev) => [...prev, ...newDrafts]);

    // Asynchronously run AI detection for each new photo
    newDrafts.forEach((draft, idx) => {
      runAiAnalysisForPhoto(draft, startIndex + idx);
    });
  };

  const runAiAnalysisForPhoto = async (draft: PhotoDraft, index: number) => {
    const detectedTags: Set<string> = new Set();
    let hasPeople = false;
    let personCount = 0;

    try {
      const img = new Image();
      img.src = draft.previewUrl;
      await new Promise((resolve) => (img.onload = resolve));

      if (cocoModelRef.current) {
        const predictions = await cocoModelRef.current.detect(img);
        predictions.forEach((pred: any) => {
          if (pred.class === "person") {
            hasPeople = true;
            personCount++;
          } else if (pred.score > 0.45) {
            detectedTags.add(pred.class.toLowerCase());
          }
        });
      }
    } catch (e) {
      console.warn("AI object detection skipped:", e);
    }

    const romanianTags: string[] = [];
    const translationMap: Record<string, string> = {
      car: "mașină",
      airplane: "avion",
      boat: "barcă",
      bus: "autobuz",
      train: "tren",
      bicycle: "bicicletă",
      dog: "câine",
      cat: "pisică",
      bird: "pasăre",
      backpack: "rucsac",
      umbrella: "umbrelă",
      bench: "bancă",
    };

    detectedTags.forEach((t) => {
      romanianTags.push(translationMap[t] || t);
    });

    // Determine initial role suggestion based on people detection
    let initialMinRole: VisibilityRole = "VIEWER";
    let isPartnerCandidate = false;

    if (hasPeople) {
      initialMinRole = "CLOSE_FRIEND";
      if (personCount === 2 || withPartner) {
        // If 2 people or trip is with partner, suggest Partner role
        isPartnerCandidate = true;
        initialMinRole = "PARTNER";
      }
    }

    // 3. Fallback AI Location if GPS is missing
    let suggestions: AILocationSuggestion[] = [];
    let reasoning = "";

    if (!draft.latitude || !draft.longitude) {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.src = draft.previewUrl;
        await new Promise((res) => (img.onload = res));

        const maxDim = 320;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        ctx?.drawImage(img, 0, 0, w, h);
        const base64Data = canvas.toDataURL("image/jpeg", 0.65).split(",")[1];

        const aiRes = await fetch("/api/ai/suggest-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            filename: draft.file.name,
            tripTitle: title || undefined,
          }),
        });

        const aiData = await aiRes.json();
        if (aiData.suggestions && aiData.suggestions.length > 0) {
          suggestions = aiData.suggestions;
          reasoning = aiData.reasoning || "";

          // Auto-apply top suggestion if high confidence
          if (suggestions[0] && suggestions[0].confidence >= 0.7) {
            draft.latitude = suggestions[0].latitude;
            draft.longitude = suggestions[0].longitude;
            draft.placeName = suggestions[0].placeName;
            draft.city = suggestions[0].city || "";
            draft.country = suggestions[0].country || "";
          }
        }
      } catch (locErr) {
        console.warn("AI location fallback error:", locErr);
      }
    }

    // Update photo state
    setPhotos((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        return {
          ...p,
          hasPeople,
          minRole: initialMinRole,
          partnerPreselected: isPartnerCandidate,
          tags: Array.from(new Set([...p.tags, ...romanianTags])),
          aiSuggestions: suggestions,
          scanningAi: false,
          aiReasoning: reasoning,
          latitude: draft.latitude,
          longitude: draft.longitude,
          placeName: draft.placeName || p.placeName,
          city: draft.city || p.city,
          country: draft.country || p.country,
        };
      })
    );
  };

  const handleManualSearch = async () => {
    if (!manualSearchQuery.trim()) return;
    try {
      setManualSearching(true);
      const res = await fetch("/api/ai/suggest-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: manualSearchQuery }),
      });
      const data = await res.json();
      if (data.suggestions && data.suggestions.length > 0) {
        setPhotos((prev) =>
          prev.map((p, idx) => {
            if (idx !== activePhotoIdx) return p;
            return {
              ...p,
              aiSuggestions: data.suggestions,
            };
          })
        );
      }
    } finally {
      setManualSearching(false);
    }
  };

  const applyLocationSuggestion = (sug: AILocationSuggestion) => {
    setPhotos((prev) =>
      prev.map((p, idx) => {
        if (idx !== activePhotoIdx) return p;
        return {
          ...p,
          latitude: sug.latitude,
          longitude: sug.longitude,
          placeName: sug.placeName,
          city: sug.city || "",
          country: sug.country || "",
        };
      })
    );
  };

  const handleAiTranslate = async (target?: Language) => {
    if (!title.trim()) {
      alert("Te rugăm să introduci mai întâi titlul călătoriei în română!");
      return;
    }

    try {
      if (!target) {
        setTranslatingLang("all");
        setTranslateStatus("Se traduce cu AI în EN, DE, ES, FR...");
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
        if (!res.ok) throw new Error(data.error || "Eroare la traducere");

        if (data.translations) {
          setTranslations((prev) => ({
            ...prev,
            en: data.translations.en || prev.en,
            de: data.translations.de || prev.de,
            es: data.translations.es || prev.es,
            fr: data.translations.fr || prev.fr,
          }));
          setTranslateStatus("Traduceri generate cu succes pentru toate limbile!");
          setTimeout(() => setTranslateStatus(null), 3000);
        }
      } else {
        setTranslatingLang(target);
        const res = await fetch("/api/ai/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            targetLang: target,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Eroare la traducere");

        if (data.translation) {
          setTranslations((prev) => ({
            ...prev,
            [target]: {
              title: data.translation.title || "",
              description: data.translation.description || "",
            },
          }));
        }
      }
    } catch (err: any) {
      alert(err.message || "A apărut o problemă la traducere");
    } finally {
      setTranslatingLang(null);
    }
  };

  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || photos.length === 0) return;

    // Verify all photos have coordinates
    const missingCoords = photos.some((p) => p.latitude === null || p.longitude === null);
    if (missingCoords) {
      alert("Te rugăm să confirmi locația pentru toate fotografiile înainte de salvare!");
      return;
    }

    try {
      setLoading(true);
      setUploadProgress("Se optimizează și se încarcă fotografiile...");

      const uploadedPhotosPayload = [];

      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        setUploadProgress(`Se încarcă poza ${i + 1} din ${photos.length}...`);

        const formData = new FormData();
        formData.append("file", p.file);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Eroare la încărcarea fotografiei");
        }

        const uploadData = await uploadRes.json();

        uploadedPhotosPayload.push({
          url: uploadData.url,
          thumbnailUrl: uploadData.thumbnailUrl,
          latitude: p.latitude,
          longitude: p.longitude,
          placeName: p.placeName || title,
          city: p.city,
          country: p.country,
          takenAt: p.takenAt,
          hasPeople: p.hasPeople,
          isPrivate: p.minRole === "ADMIN" || p.minRole === "PARTNER" || p.isPrivate,
          minRole: p.minRole,
          isCountryCover: p.isCountryCover,
          partnerPreselected: p.partnerPreselected,
          tags: p.tags,
        });
      }

      setUploadProgress("Se salvează călătoria în baza de date...");

      const createRes = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          startDate,
          endDate: endDate ? endDate : null,
          isPrivate: isTripPrivate,
          minRole: tripMinRole,
          withPartner,
          partnerNotes: withPartner ? partnerNotes : null,
          allowedUserIds: selectedUserIds,
          photos: uploadedPhotosPayload,
          translations: JSON.stringify(translations),
        }),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json();
        throw new Error(errorData.error || "Eroare la salvare");
      }

      onTripCreated();
      onClose();
    } catch (err: any) {
      alert(err.message || "A apărut o problemă la salvare");
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const currentActive = photos[activePhotoIdx];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in pointer-events-auto overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        tabIndex={-1}
        className="relative w-full h-full sm:h-auto sm:max-h-[92vh] max-w-5xl glass-panel-glow rounded-none sm:rounded-3xl p-4 sm:p-8 border border-olive-500/30 shadow-2xl my-0 sm:my-8 overflow-y-auto focus:outline-none"
      >
        <button
          onClick={onClose}
          aria-label="Închide fereastra de încărcare"
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors z-20 focus:ring-2 focus:ring-olive-500"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="mb-5 sm:mb-6 pr-8">
          <div className="flex items-center gap-2 text-olive-700 dark:text-olive-400 mb-1">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wider">Admin Photo Manager & Studio</span>
          </div>
          <h2 id="upload-modal-title" className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Adaugă și Gestionează Călătoria pe Glob
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Încarcă pachete de fotografii, ajustează locațiile detectate de AI, stabilește permisiunile per rol și alege poza reprezentativă de țară.
          </p>
        </div>


        <form onSubmit={handleSaveTrip} className="space-y-6">
          {/* Trip Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 block">
                {t("admin.tripStartDate")}
              </label>
              <div className="flex items-center px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus-within:border-olive-500">
                <Calendar className="w-4 h-4 text-olive-600 dark:text-olive-400 mr-2 shrink-0" />
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-sm text-slate-900 dark:text-slate-200 focus:outline-none w-full [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 block">
                {t("admin.tripEndDate")}
              </label>
              <div className="flex items-center px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus-within:border-olive-500">
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-sm text-slate-900 dark:text-slate-200 focus:outline-none w-full [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Multilingual Title & Description Studio */}
          <div className="rounded-2xl bg-slate-100/90 dark:bg-slate-950/70 border border-slate-200 dark:border-olive-500/25 p-4 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
              <div>
                <div className="flex items-center gap-2 text-olive-700 dark:text-olive-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t("admin.translationsTitle")}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Româna este limba principală. Traducerile în EN, DE, ES, FR pot fi generate automat cu AI și editate manual.
                </p>
              </div>

              {/* 1-Click AI Translate All Button */}
              <button
                type="button"
                onClick={() => handleAiTranslate()}
                disabled={!title.trim() || translatingLang !== null}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-olive-700 hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm shrink-0"
              >
                {translatingLang === "all" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t("admin.translating")}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t("admin.aiTranslateAllBtn")}</span>
                  </>
                )}
              </button>
            </div>

            {translateStatus && (
              <div className="p-2.5 rounded-xl bg-olive-100 dark:bg-olive-950/60 border border-olive-300 dark:border-olive-500/40 text-xs text-olive-900 dark:text-olive-200 flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-olive-600 dark:text-olive-400 shrink-0" />
                <span>{translateStatus}</span>
              </div>
            )}

            {/* Language Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-900/90 rounded-xl border border-slate-300 dark:border-slate-800">
              {(["ro", "en", "de", "es", "fr"] as Language[]).map((lang) => {
                const isActive = activeLangTab === lang;
                const hasContent =
                  lang === "ro"
                    ? Boolean(title.trim())
                    : Boolean(translations[lang]?.title?.trim());

                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveLangTab(lang)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-white dark:bg-olive-600/30 text-olive-900 dark:text-olive-200 border border-olive-500/40 shadow-xs font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60 border border-transparent"
                    }`}
                  >
                    <FlagIcon code={lang} className="w-4 h-2.5 rounded-xs" />
                    <span>
                      {lang === "ro" && "Română (Bază)"}
                      {lang === "en" && "English"}
                      {lang === "de" && "Deutsch"}
                      {lang === "es" && "Español"}
                      {lang === "fr" && "Français"}
                    </span>
                    {hasContent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-olive-500 ml-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            {activeLangTab === "ro" ? (
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Titlul călătoriei (Română - Principal) *
                    </label>
                    <span className="text-[10px] text-olive-700 dark:text-olive-400 font-semibold uppercase">Limba Bază</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ex: Turul Japoniei: Kyoto & Tokyo"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 block">
                    Descriere Călătorie (Română)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Câteva cuvinte despre traseu, atmosferă și locurile explorate..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500 resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlagIcon code={activeLangTab} className="w-4 h-3 rounded-xs" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Versiunea în {activeLangTab.toUpperCase()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAiTranslate(activeLangTab)}
                    disabled={!title.trim() || translatingLang !== null}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-olive-800 dark:text-olive-300 text-xs font-semibold border border-olive-500/30 transition-all disabled:opacity-40"
                  >
                    {translatingLang === activeLangTab ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Se traduce...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-olive-600 dark:text-olive-400" />
                        <span>Traduce doar {activeLangTab.toUpperCase()} cu AI</span>
                      </>
                    )}
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 block">
                    Titlu Călătorie ({activeLangTab.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    value={translations[activeLangTab]?.title || ""}
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [activeLangTab]: {
                          ...prev[activeLangTab],
                          title: e.target.value,
                        },
                      }))
                    }
                    placeholder={`Titlul tradus în ${activeLangTab.toUpperCase()}...`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 block">
                    Descriere Călătorie ({activeLangTab.toUpperCase()})
                  </label>
                  <textarea
                    rows={2}
                    value={translations[activeLangTab]?.description || ""}
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [activeLangTab]: {
                          ...prev[activeLangTab],
                          description: e.target.value,
                        },
                      }))
                    }
                    placeholder={`Descrierea tradusă în ${activeLangTab.toUpperCase()}...`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500 resize-none"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Poți edita sau corecta oricând această traducere manual.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Partner & Privacy Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Traveled with Partner Box */}
            <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                  <div>
                    <span className="text-xs font-bold text-rose-950 dark:text-rose-200 block">Călătorie în Doi (cu Partenerul)</span>
                    <span className="text-[11px] text-rose-700/80 dark:text-rose-300/70">Deblochează amintirile speciale pentru Partener</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWithPartner(!withPartner)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    withPartner ? "bg-rose-500" : "bg-slate-300 dark:bg-slate-800"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      withPartner ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {withPartner && (
                <div className="animate-fade-in pt-1">
                  <label className="text-[11px] font-bold text-rose-900 dark:text-rose-300 mb-1 block">
                    Notițe & Detalii Secrete pentru Partener:
                  </label>
                  <textarea
                    rows={2}
                    value={partnerNotes}
                    onChange={(e) => setPartnerNotes(e.target.value)}
                    placeholder="Amintiri, momente amuzante sau detalii romantice vizibile doar de voi doi..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950/80 border border-rose-300 dark:border-rose-800/40 text-xs text-rose-950 dark:text-rose-100 placeholder:text-rose-400 dark:placeholder:text-rose-900/60 focus:outline-none focus:border-rose-400 resize-none"
                  />
                </div>
              )}
            </div>

            {/* General Trip Visibility */}
            <div className="p-4 rounded-2xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block mb-1">Nivel Minim de Acces Călătorie</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3">
                  Determină cine poate descoperi acest album pe hartă.
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["VIEWER", "CLOSE_FRIEND", "PARTNER", "ADMIN"] as VisibilityRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTripMinRole(r)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all text-center ${
                        tripMinRole === r
                          ? "bg-olive-700 border-olive-500 text-white shadow-sm font-bold"
                          : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      {r === "VIEWER" && "Viewer"}
                      {r === "CLOSE_FRIEND" && "Prieten"}
                      {r === "PARTNER" && "Partener"}
                      {r === "ADMIN" && "Admin"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Photo Dropzone */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Fotografii din călătorie *</label>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {photos.length} {photos.length === 1 ? "poză adăugată" : "poze adăugate"}
              </span>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-olive-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-900/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-olive-600 dark:text-olive-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Trage fotografiile aici sau apasă pentru a alege</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Extracție automată GPS EXIF • Detectare AI persoane & cuplu • Sugestii automate de permisiuni
              </p>
            </div>
          </div>

          {/* Photo Review & Adjustment Studio */}
          {photos.length > 0 && currentActive && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-olive-700 dark:text-olive-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Inspectare & Confirmare ({activePhotoIdx + 1} din {photos.length})
                </span>

                <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1 max-w-full">
                  {photos.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`w-7 h-7 shrink-0 rounded-lg text-xs font-bold transition-all border ${
                        idx === activePhotoIdx
                          ? "bg-olive-700 border-olive-500 text-white shadow-sm"
                          : p.isCountryCover
                          ? "bg-amber-100 dark:bg-amber-950 border-amber-500 text-amber-900 dark:text-amber-300"
                          : p.minRole === "PARTNER"
                          ? "bg-rose-100 dark:bg-rose-950 border-rose-500 text-rose-900 dark:text-rose-300"
                          : p.hasPeople
                          ? "bg-olive-100 dark:bg-olive-950 border-olive-500 text-olive-900 dark:text-olive-300"
                          : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                {/* Thumbnail Preview */}
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 shadow-md">
                  <img src={currentActive.previewUrl} alt="" className="w-full h-full object-cover" />
                  {currentActive.scanningAi && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-1 text-olive-400">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-[11px] font-semibold">AI analizează poza...</span>
                    </div>
                  )}

                  {/* Badges on preview */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {currentActive.isCountryCover && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-md">
                        <Star className="w-3 h-3 fill-slate-950" />
                        Poză Oficială Țară
                      </span>
                    )}
                    {currentActive.partnerPreselected && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-md">
                        <Heart className="w-3 h-3 fill-white" />
                        Amintire Cuplu
                      </span>
                    )}
                  </div>
                </div>

                {/* Permissions & Controls */}
                <div className="md:col-span-2 space-y-3">
                  {/* Role Selector for this Photo */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 block">
                      Permisiune Vizibilitate pentru această Poză:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPhotos((prev) =>
                            prev.map((p, i) => (i === activePhotoIdx ? { ...p, minRole: "VIEWER", hasPeople: false } : p))
                          );
                        }}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                          currentActive.minRole === "VIEWER"
                            ? "bg-olive-700 border-olive-500 text-white shadow-sm font-bold"
                            : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>Viewer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPhotos((prev) =>
                            prev.map((p, i) => (i === activePhotoIdx ? { ...p, minRole: "CLOSE_FRIEND", hasPeople: true } : p))
                          );
                        }}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                          currentActive.minRole === "CLOSE_FRIEND"
                            ? "bg-amber-600 border-amber-500 text-white shadow-sm font-bold"
                            : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Star className="w-3 h-3" />
                        <span>Prieten</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPhotos((prev) =>
                            prev.map((p, i) => (i === activePhotoIdx ? { ...p, minRole: "PARTNER", partnerPreselected: true } : p))
                          );
                        }}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                          currentActive.minRole === "PARTNER"
                            ? "bg-rose-600 border-rose-500 text-white shadow-sm font-bold"
                            : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Heart className="w-3 h-3" />
                        <span>Partener</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPhotos((prev) =>
                            prev.map((p, i) => (i === activePhotoIdx ? { ...p, minRole: "ADMIN" } : p))
                          );
                        }}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                          currentActive.minRole === "ADMIN"
                            ? "bg-olive-800 border-olive-600 text-white shadow-sm font-bold"
                            : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        <span>Doar Admin</span>
                      </button>
                    </div>
                  </div>

                  {/* Country Cover Toggle Button */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs">
                      <Star className={`w-4 h-4 ${currentActive.isCountryCover ? "text-amber-500 fill-amber-500" : "text-slate-400"}`} />
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">Poză Oficială de Țară (Public Mode)</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {currentActive.isCountryCover
                            ? "Această fotografie va reprezenta țara pe glob pentru vizitatorii publici."
                            : "Setează această fotografie ca singura poză reprezentativă pentru această țară."}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotos((prev) =>
                          prev.map((p, i) => (i === activePhotoIdx ? { ...p, isCountryCover: !p.isCountryCover } : p))
                        );
                      }}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                        currentActive.isCountryCover
                          ? "bg-amber-500 text-slate-950 shadow-sm"
                          : "bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {currentActive.isCountryCover ? "✓ Poză Setată" : "Setează ca Poză Oficială"}
                    </button>
                  </div>

                  {/* Location Confirmation & Manual Adjustment */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-olive-700 dark:text-olive-400 block flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Locație Geografică (Confirmă sau Ajustează):
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5 font-medium">Obiectiv / Nume Punct</label>
                        <input
                          type="text"
                          value={currentActive.placeName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPhotos((prev) =>
                              prev.map((p, i) => (i === activePhotoIdx ? { ...p, placeName: val } : p))
                            );
                          }}
                          placeholder="ex: Turnul Eiffel"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5 font-medium">Oraș</label>
                        <input
                          type="text"
                          value={currentActive.city}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPhotos((prev) =>
                              prev.map((p, i) => (i === activePhotoIdx ? { ...p, city: val } : p))
                            );
                          }}
                          placeholder="ex: Paris"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5 font-medium">Țară</label>
                        <input
                          type="text"
                          value={currentActive.country}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPhotos((prev) =>
                              prev.map((p, i) => (i === activePhotoIdx ? { ...p, country: val } : p))
                            );
                          }}
                          placeholder="ex: Franța"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5 font-medium">Latitudine</label>
                        <input
                          type="number"
                          step="any"
                          value={currentActive.latitude ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : null;
                            setPhotos((prev) =>
                              prev.map((p, i) => (i === activePhotoIdx ? { ...p, latitude: val } : p))
                            );
                          }}
                          placeholder="ex: 48.8584"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5 font-medium">Longitudine</label>
                        <input
                          type="number"
                          step="any"
                          value={currentActive.longitude ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : null;
                            setPhotos((prev) =>
                              prev.map((p, i) => (i === activePhotoIdx ? { ...p, longitude: val } : p))
                            );
                          }}
                          placeholder="ex: 2.2945"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500"
                        />
                      </div>
                    </div>

                    {/* AI Location Suggestions if available */}
                    {currentActive.aiSuggestions.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block mb-1">
                          Sugestii Detectate de AI (Apasă pentru a aplica instant):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {currentActive.aiSuggestions.map((sug, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => applyLocationSuggestion(sug)}
                              className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/80 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 transition-all flex items-center gap-1"
                            >
                              <MapPin className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>{sug.placeName} ({sug.city ? `${sug.city}, ` : ""}{sug.country})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Search helper if coordinates missing */}
                    {currentActive.latitude === null && (
                      <div className="flex gap-1.5 pt-1">
                        <input
                          type="text"
                          value={manualSearchQuery}
                          onChange={(e) => setManualSearchQuery(e.target.value)}
                          placeholder="Caută oraș sau obiectiv turistic..."
                          className="flex-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500"
                        />
                        <button
                          type="button"
                          onClick={handleManualSearch}
                          disabled={manualSearching}
                          className="px-3 py-1 rounded-lg bg-olive-700 hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 text-white text-xs font-bold transition-all flex items-center gap-1"
                        >
                          {manualSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                          <span>Caută</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit & Progress */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            {uploadProgress ? (
              <div className="flex items-center gap-2 text-olive-700 dark:text-olive-400 text-xs font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{uploadProgress}</span>
              </div>
            ) : (
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Toate fotografiile vor fi salvate local și catalogate automat pe Glob.
              </span>
            )}

            <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white text-xs font-semibold transition-all text-center"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={loading || photos.length === 0}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-olive-700 hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Se procesează...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Salvează Călătoria</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
