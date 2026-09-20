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
} from "lucide-react";
import exifr from "exifr";
import { AILocationSuggestion } from "@/lib/types";

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
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

  // Load available registered users for selective private sharing
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/users")
      .then((res) => (res.ok ? res.json() : { users: [] }))
      .then((data) => setRegisteredUsers(data.users || []))
      .catch(() => {});
  }, [isOpen]);

  // Load TensorFlow COCO-SSD model dynamically in client for person detection and tagging
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

  // Process files: EXIF extraction + AI Person/Object detection
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newDrafts: PhotoDraft[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
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

    setPhotos((prev) => [...prev, ...newDrafts]);

    // Asynchronously run AI detection for each new photo
    newDrafts.forEach((draft, idx) => {
      runAiAnalysisForPhoto(draft, photos.length + idx);
    });
  };

  const runAiAnalysisForPhoto = async (draft: PhotoDraft, index: number) => {
    // 2. AI Person & Object Detection using loaded TensorFlow COCO model
    const detectedTags: Set<string> = new Set();
    let hasPeople = false;

    try {
      const img = new Image();
      img.src = draft.previewUrl;
      await new Promise((resolve) => (img.onload = resolve));

      if (cocoModelRef.current) {
        const predictions = await cocoModelRef.current.detect(img);
        predictions.forEach((pred: any) => {
          if (pred.class === "person") {
            hasPeople = true;
          } else if (pred.score > 0.45) {
            detectedTags.add(pred.class.toLowerCase());
          }
        });
      }
    } catch (e) {
      console.warn("AI object detection skipped:", e);
    }

    // Translate common COCO tags to friendly Romanian terms
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

    // 3. Fallback AI Location if GPS is missing
    let suggestions: AILocationSuggestion[] = [];
    let reasoning = "";

    if (!draft.latitude || !draft.longitude) {
      try {
        // Create scaled down thumbnail base64 for fast API transmission
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.src = draft.previewUrl;
        await new Promise((resolve) => (img.onload = resolve));

        const maxDim = 512;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }

        canvas.width = w;
        canvas.height = h;
        ctx?.drawImage(img, 0, 0, w, h);
        const base64 = canvas.toDataURL("image/jpeg", 0.7);

        const res = await fetch("/api/ai/suggest-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 }),
        });

        if (res.ok) {
          const aiData = await res.json();
          if (aiData.suggestions && aiData.suggestions.length > 0) {
            suggestions = aiData.suggestions;
            reasoning = aiData.suggestions[0].reasoning || "Reper turistic identificat vizual de AI";
          }
        }
      } catch (err) {
        console.warn("AI location suggestion error:", err);
      }
    }

    setPhotos((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        return {
          ...p,
          hasPeople,
          isPrivate: hasPeople ? true : p.isPrivate, // Automatically mark private if people detected!
          tags: Array.from(new Set([...p.tags, ...romanianTags])),
          aiSuggestions: suggestions,
          aiReasoning: reasoning,
          scanningAi: false,
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
          isPrivate: p.isPrivate,
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
          isPrivate: isTripPrivate,
          allowedUserIds: selectedUserIds,
          photos: uploadedPhotosPayload,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in pointer-events-auto overflow-y-auto">
      <div className="relative w-full max-w-4xl glass-panel-glow rounded-3xl p-6 sm:p-8 border border-cyan-500/30 shadow-2xl my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 text-cyan-400 mb-1">
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Modul de Înregistrare Călătorie</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Adaugă o nouă călătorie pe Glob</h2>
        </div>

        <form onSubmit={handleSaveTrip} className="space-y-6">
          {/* General Trip Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">Titlul călătoriei *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Turul Toscanei & Florența"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">Data călătoriei *</label>
              <div className="flex items-center px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus-within:border-cyan-400">
                <Calendar className="w-4 h-4 text-cyan-400 mr-2" />
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-sm text-slate-200 focus:outline-none w-full [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 mb-1.5 block">Descriere / Amintiri</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scrie câteva gânduri despre locurile explorate..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Privacy & Selective Sharing */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isTripPrivate ? (
                  <Lock className="w-4 h-4 text-purple-400" />
                ) : (
                  <Globe2 className="w-4 h-4 text-cyan-400" />
                )}
                <div>
                  <span className="text-xs font-bold text-white block">
                    {isTripPrivate ? "Jurnal Privat (Doar tu și utilizatorii aleși)" : "Călătorie Publică"}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isTripPrivate
                      ? "Nu va apărea pentru vizitatorii anonimi (Guest)."
                      : "Vizibilă pe Glob pentru toți utilizatorii."}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTripPrivate(!isTripPrivate)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isTripPrivate
                    ? "bg-purple-600 text-white shadow-glow"
                    : "bg-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                {isTripPrivate ? "Schimbă pe Public" : "Fă Privat"}
              </button>
            </div>

            {/* If trip is private, allow sharing with specific users */}
            {isTripPrivate && registeredUsers.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  Permite vizualizarea pentru următorii utilizatori înregistrați:
                </span>
                <div className="flex flex-wrap gap-2">
                  {registeredUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedUserIds((prev) =>
                            isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                          );
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                          isSelected
                            ? "bg-purple-950/80 border-purple-500 text-purple-200"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <UserCheck className={`w-3 h-3 ${isSelected ? "text-purple-400" : "text-slate-600"}`} />
                        <span>{u.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Photo Dropzone */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 block">Fotografii din călătorie *</label>
              <span className="text-xs text-slate-400">
                {photos.length} {photos.length === 1 ? "poză adăugată" : "poze adăugate"}
              </span>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-950/50 hover:bg-slate-900/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-200">Trage fotografiile aici sau apasă pentru a alege</p>
              <p className="text-xs text-slate-500 mt-1">
                EXIF GPS este extras automat. AI-ul detectează persoane și etichetează obiecte.
              </p>
            </div>
          </div>

          {/* Photo Inspector & AI Location Resolver */}
          {photos.length > 0 && currentActive && (
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Inspectare & AI Tagging pentru poza {activePhotoIdx + 1} din {photos.length}
                </span>

                <div className="flex gap-1.5">
                  {photos.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`w-6 h-6 rounded-md text-xs font-bold transition-all ${
                        idx === activePhotoIdx ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                {/* Thumbnail Preview */}
                <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-950 border border-slate-800">
                  <img src={currentActive.previewUrl} alt="" className="w-full h-full object-cover" />
                  {currentActive.scanningAi && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-1 text-cyan-400">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-[11px] font-semibold">AI analizează poza...</span>
                    </div>
                  )}
                </div>

                {/* Status, Privacy & Coordinates */}
                <div className="md:col-span-2 space-y-3">
                  {/* AI Person Detection Banner */}
                  {currentActive.hasPeople && (
                    <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-between text-xs text-purple-200">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <span>S-au detectat persoane în imagine. Marcată automat ca Privată!</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotos((prev) =>
                            prev.map((p, i) => (i === activePhotoIdx ? { ...p, isPrivate: !p.isPrivate } : p))
                          );
                        }}
                        className="px-2 py-1 rounded-md bg-purple-800/80 hover:bg-purple-700 text-white text-[11px] font-semibold"
                      >
                        {currentActive.isPrivate ? "Păstrează Privat" : "Fă Public"}
                      </button>
                    </div>
                  )}

                  {/* Coordinates & Place Info */}
                  {currentActive.latitude !== null && currentActive.longitude !== null ? (
                    <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <div>
                          <span className="font-bold block">
                            Locație confirmată: {currentActive.placeName || "Punct GPS"}
                          </span>
                          <span className="text-[10px] text-emerald-400/80">
                            Lat: {currentActive.latitude.toFixed(4)}, Lon: {currentActive.longitude.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-xs text-amber-300 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span>Lipsește GPS-ul din EXIF. Folosește sugestia AI sau caută manual mai jos:</span>
                      </div>

                      {/* AI Suggestions buttons */}
                      {currentActive.aiSuggestions.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold text-amber-200 block">
                            ✨ Sugestii propuse de AI:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {currentActive.aiSuggestions.map((sug, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => applyLocationSuggestion(sug)}
                                className="text-xs px-2.5 py-1.5 rounded-lg bg-cyan-950 border border-cyan-600/50 hover:bg-cyan-900 text-cyan-200 transition-all font-semibold flex items-center gap-1"
                              >
                                <MapPin className="w-3 h-3 text-cyan-400" />
                                <span>{sug.placeName}</span>
                                <span className="text-[10px] opacity-70">({Math.round(sug.confidence * 100)}%)</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Manual Location Search Fallback */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={manualSearchQuery}
                          onChange={(e) => setManualSearchQuery(e.target.value)}
                          placeholder="Scrie orașul sau reperul (ex: Turnul Eiffel, Paris)..."
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                        />
                        <button
                          type="button"
                          onClick={handleManualSearch}
                          disabled={manualSearching}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                        >
                          {manualSearching ? "Căutare..." : "Caută"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AI Tags on photo */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-cyan-400" /> Etichete AI:
                    </span>
                    {currentActive.tags.length === 0 ? (
                      <span className="text-xs text-slate-500 italic">Fără etichete automate</span>
                    ) : (
                      currentActive.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-cyan-300"
                        >
                          #{tag}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            {uploadProgress ? (
              <span className="text-xs text-cyan-400 animate-pulse flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadProgress}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Verifică locațiile fotografiilor înainte de a salva.</span>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-semibold transition-colors"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={loading || photos.length === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? "Se salvează..." : "Publică pe Glob"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
