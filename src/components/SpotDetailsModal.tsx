"use client";

import React, { useState, useRef } from "react";
import {
  X,
  MapPin,
  Calendar,
  Download,
  Eye,
  Heart,
  Star,
  Shield,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { SpotPinData, PhotoData, TripData, SafeUser } from "@/lib/types";
import { useModalA11y } from "@/hooks/useModalA11y";

interface SpotDetailsModalProps {
  spot: SpotPinData | null;
  isOpen: boolean;
  onClose: () => void;
  trips: TripData[];
  currentUser: SafeUser | null;
  onOpenTripDrawer: (trip: TripData, photo?: PhotoData) => void;
}

export function SpotDetailsModal({
  spot,
  isOpen,
  onClose,
  trips,
  currentUser,
  onOpenTripDrawer,
}: SpotDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useModalA11y({ isOpen, onClose, modalRef });

  const [activeTierFilter, setActiveTierFilter] = useState<string>("ALL");
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);

  if (!isOpen || !spot) return null;

  const isPartner = currentUser?.role === "PARTNER" || currentUser?.role === "ADMIN";
  const isFriend = currentUser?.role === "CLOSE_FRIEND" || isPartner;

  // Filter photos based on tab
  const displayPhotos = spot.photos.filter((p) => {
    if (activeTierFilter === "ALL") return true;
    if (activeTierFilter === "PUBLIC") return !p.isPrivate && (p.minRole === "PUBLIC" || !p.minRole);
    if (activeTierFilter === "FRIENDS") return p.minRole === "CLOSE_FRIEND" || p.hasPeople;
    if (activeTierFilter === "PARTNER") return p.minRole === "PARTNER" || p.partnerPreselected;
    return true;
  });

  const associatedTrip = trips.find((t) => t.id === spot.tripIds[0]) || trips[0];

  const handleDownload = (photo: PhotoData) => {
    const downloadUrl = photo.originalUrl || photo.url;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${spot.name.replace(/\s+/g, "_")}-${photo.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spot-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] glass-panel-glow rounded-3xl border border-olive-500/30 overflow-hidden flex flex-col shadow-2xl bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-olive-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-olive-500/15 flex items-center justify-center text-olive-700 dark:text-olive-300">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 id="spot-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
                {spot.name}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {spot.city ? `${spot.city}, ` : ""}
                {spot.country || "Punct de Explorare"} • {spot.totalPhotosCount} fotografii
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {associatedTrip && (
              <button
                onClick={() => {
                  onClose();
                  onOpenTripDrawer(associatedTrip, spot.coverPhoto);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-olive-800 dark:text-olive-300 bg-olive-500/15 hover:bg-olive-500/25 transition-colors"
              >
                <span>Deschide Călătoria</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs by Tier */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-olive-500/15 bg-olive-500/5 overflow-x-auto">
          <button
            onClick={() => setActiveTierFilter("ALL")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              activeTierFilter === "ALL"
                ? "bg-olive-700 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-olive-500/20"
            }`}
          >
            Toate ({spot.photos.length})
          </button>

          {spot.hasPublicPhotos && (
            <button
              onClick={() => setActiveTierFilter("PUBLIC")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                activeTierFilter === "PUBLIC"
                  ? "bg-olive-700 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-olive-500/20"
              }`}
            >
              <Eye className="w-3 h-3 text-olive-600 dark:text-olive-400" />
              <span>Publice</span>
            </button>
          )}

          {isFriend && spot.hasFriendsPhotos && (
            <button
              onClick={() => setActiveTierFilter("FRIENDS")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                activeTierFilter === "FRIENDS"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
              }`}
            >
              <Star className="w-3 h-3" />
              <span>Prieteni</span>
            </button>
          )}

          {isPartner && spot.hasPartnerPhotos && (
            <button
              onClick={() => setActiveTierFilter("PARTNER")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                activeTierFilter === "PARTNER"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-rose-800 dark:text-rose-300 hover:bg-rose-500/20"
              }`}
            >
              <Heart className="w-3 h-3 fill-rose-500" />
              <span>În Doi (Partener)</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {spot.description && (
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-6 italic bg-olive-500/10 p-3 rounded-2xl border border-olive-500/20">
              "{spot.description}"
            </p>
          )}

          {/* Photos Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {displayPhotos.map((photo) => {
              const isPartnerPhoto = photo.minRole === "PARTNER" || photo.partnerPreselected;
              const isFriendPhoto = photo.minRole === "CLOSE_FRIEND" || photo.hasPeople;

              return (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border border-slate-300 dark:border-slate-800 bg-slate-900 shadow-md transition-all duration-200 hover:scale-[1.03] hover:shadow-xl"
                >
                  <img
                    src={photo.thumbnailUrl || photo.url}
                    alt={photo.caption || photo.placeName || spot.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Tier Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    {isPartnerPhoto && isPartner && (
                      <span className="p-1 rounded-lg bg-rose-600/90 text-white shadow-sm" title="Fotografie În Doi">
                        <Heart className="w-3 h-3 fill-white" />
                      </span>
                    )}
                    {isFriendPhoto && isFriend && !isPartnerPhoto && (
                      <span className="p-1 rounded-lg bg-amber-600/90 text-white shadow-sm" title="Fotografie cu Prieteni">
                        <Star className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {/* Hover Overlay with Caption & Actions */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                    {photo.caption && (
                      <p className="text-[11px] font-bold text-white line-clamp-1 mb-1">
                        {photo.caption}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-300">
                        {new Date(photo.takenAt).toLocaleDateString("ro-RO")}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(photo);
                        }}
                        title="Descarcă original"
                        className="p-1 rounded-lg bg-white/20 hover:bg-white/40 text-white transition-colors"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Photo Lightbox Overlay */}
        {selectedPhoto && (
          <div
            className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-lg flex flex-col p-4 sm:p-6 animate-fade-in"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-white">
                  {selectedPhoto.caption || selectedPhoto.placeName || spot.name}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(selectedPhoto.takenAt).toLocaleString("ro-RO")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(selectedPhoto);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-olive-700 hover:bg-olive-600 text-white text-xs font-bold transition-colors shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Descarcă Original</span>
                </button>

                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div
              className="flex-1 flex items-center justify-center overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedPhoto.url}
                alt=""
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
