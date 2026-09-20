"use client";

import React, { useState } from "react";
import {
  X,
  Calendar,
  MapPin,
  Lock,
  Globe2,
  Send,
  MessageSquare,
  Sparkles,
  Trash2,
  Tag,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { TripData, PhotoData, SafeUser } from "@/lib/types";

interface TripDrawerProps {
  trip: TripData | null;
  selectedPhoto: PhotoData | null;
  onClose: () => void;
  onSelectPhoto: (photo: PhotoData) => void;
  currentUser: SafeUser | null;
  onAddComment: (tripId: string, content: string) => Promise<void>;
  onDeleteTrip?: (tripId: string) => Promise<void>;
  onTagClick?: (tag: string) => void;
  onFlyToPhoto?: (lat: number, lon: number) => void;
}

export function TripDrawer({
  trip,
  selectedPhoto,
  onClose,
  onSelectPhoto,
  currentUser,
  onAddComment,
  onDeleteTrip,
  onTagClick,
  onFlyToPhoto,
}: TripDrawerProps) {
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  if (!trip) return null;

  const currentPhoto = selectedPhoto || trip.photos[activePhotoIdx] || trip.photos[0];

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      await onAddComment(trip.id, newComment.trim());
      setNewComment("");
    } finally {
      setSubmittingComment(false);
    }
  };

  const formattedDate = trip.isMaskedDate
    ? `Anul ${trip.year}`
    : new Date(trip.startDate).toLocaleDateString("ro-RO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-[480px] glass-panel-glow border-l border-cyan-500/20 shadow-2xl flex flex-col pointer-events-auto transform transition-transform duration-300 ease-out overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-700/60 bg-slate-900/60">
        <div className="flex items-center gap-2">
          {trip.isPrivate ? (
            <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-950/80 text-purple-300 border border-purple-700/50">
              <Lock className="w-3 h-3 text-purple-400" />
              Jurnal Privat
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">
              <Globe2 className="w-3 h-3 text-cyan-400" />
              Călătorie Publică
            </span>
          )}
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-cyan-400" />
            {formattedDate}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {currentUser?.role === "ADMIN" && onDeleteTrip && (
            <button
              onClick={() => {
                if (confirm(`Ești sigur că vrei să ștergi călătoria "${trip.title}"?`)) {
                  onDeleteTrip(trip.id);
                }
              }}
              title="Șterge călătoria"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Title and description */}
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">{trip.title}</h2>
          {trip.description && (
            <p className="mt-2 text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800">
              {trip.description}
            </p>
          )}
        </div>

        {/* Featured Photo Viewer */}
        {currentPhoto && (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-950 border border-slate-700 shadow-xl group">
              <img
                src={currentPhoto.url}
                alt={currentPhoto.placeName || trip.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-80" />

              {/* Badges on image */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                {currentPhoto.hasPeople && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-900/90 text-purple-200 border border-purple-500/40 backdrop-blur-md">
                    <UserCheck className="w-3 h-3 text-purple-300" />
                    Persoane detectate (AI)
                  </span>
                )}
                {currentPhoto.isPrivate && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-900/90 text-purple-200 border border-purple-500/40 backdrop-blur-md">
                    <Lock className="w-3 h-3 text-purple-300" />
                    Privată
                  </span>
                )}
              </div>

              {/* Photo Caption & FlyTo Button */}
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    {currentPhoto.placeName || `${currentPhoto.city || ""}, ${currentPhoto.country || ""}`}
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    {trip.isMaskedDate
                      ? `Anul ${currentPhoto.takenYear || trip.year}`
                      : new Date(currentPhoto.takenAt).toLocaleDateString("ro-RO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                  </p>
                </div>

                {onFlyToPhoto && (
                  <button
                    onClick={() => onFlyToPhoto(currentPhoto.latitude, currentPhoto.longitude)}
                    title="Apropie Globul de această locație"
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-cyan-500/80 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-glow hover:scale-105"
                  >
                    <span>Zoom pe Glob</span>
                  </button>
                )}
              </div>
            </div>

            {/* AI Tags on current photo */}
            {currentPhoto.tags && currentPhoto.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" /> Obiecte AI:
                </span>
                {currentPhoto.tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => onTagClick && onTagClick(tag)}
                    className="text-xs px-2 py-0.5 rounded-md bg-cyan-950/60 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-800/40 transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Thumbnails list if multiple photos */}
        {trip.photos.length > 1 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Fotografii din călătorie ({trip.photos.length})
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {trip.photos.map((p, idx) => {
                const isSelected = p.id === currentPhoto?.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActivePhotoIdx(idx);
                      onSelectPhoto(p);
                    }}
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                      isSelected
                        ? "border-cyan-400 scale-105 shadow-glow"
                        : "border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={p.thumbnailUrl || p.url} alt="" className="w-full h-full object-cover" />
                    {p.isPrivate && (
                      <span className="absolute top-1 right-1 p-0.5 rounded-full bg-purple-900/90 text-purple-200">
                        <Lock className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="border-t border-slate-800 pt-5 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Comentarii ({trip.comments.length})</h3>
          </div>

          {/* Comment List */}
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {trip.comments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nu există comentarii încă. Fii primul care lasă un mesaj!</p>
            ) : (
              trip.comments.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-cyan-300">{c.userName}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString("ro-RO")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-normal">{c.content}</p>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          {currentUser ? (
            <form onSubmit={handleSendComment} className="flex gap-2 pt-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Scrie un comentariu..."
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={submittingComment || !newComment.trim()}
                className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                Doar utilizatorii înregistrați pot comenta. Autentifică-te pentru a participa la conversație!
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
