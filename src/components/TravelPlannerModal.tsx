"use client";

import React, { useState, useRef } from "react";
import {
  Sparkles,
  X,
  Compass,
  Calendar,
  Clock,
  Heart,
  MapPin,
  CheckCircle2,
  ChevronRight,
  Globe2,
  Key,
  Layers,
  Loader2,
  Camera,
  ArrowRight,
  Luggage,
  CloudSun,
  CheckSquare,
  Square,
  Plus,
  HelpCircle,
} from "lucide-react";
import { TravelPlanData, TripData, PackingItem } from "@/lib/types";
import { useModalA11y } from "@/hooks/useModalA11y";

interface TravelPlannerModalProps {
  onClose: () => void;
  onTripCreated: (newTrip: TripData) => void;
}

const TRAVEL_STYLES = [
  { id: "Aventură & Natură", label: "Aventură & Natură", icon: "🏔️" },
  { id: "Romantic & Relaxare", label: "Romantic & Relaxare", icon: "✨" },
  { id: "Cultură & Istorie", label: "Cultură & Istorie", icon: "🏛️" },
  { id: "Fotografie & Peisaje", label: "Fotografie & Peisaje", icon: "📸" },
  { id: "Gastronomie & Vinuri", label: "Gastronomie & Vinuri", icon: "🍷" },
];

export const TravelPlannerModal: React.FC<TravelPlannerModalProps> = ({
  onClose,
  onTripCreated,
}) => {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(5);
  const [dates, setDates] = useState("Vara 2025");
  const [style, setStyle] = useState("Romantic & Relaxare");
  const [withPartner, setWithPartner] = useState(true);
  const [customPrompt, setCustomPrompt] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<
    (TravelPlanData & { latitude: number; longitude: number }) | null
  >(null);

  const [activeTab, setActiveTab] = useState<"itinerary" | "packing" | "weather">("itinerary");
  const [customItemText, setCustomItemText] = useState("");
  const [packingCategoryFilter, setPackingCategoryFilter] = useState<string>("all");

  const modalRef = useRef<HTMLDivElement>(null);
  useModalA11y({ isOpen: true, onClose, modalRef });

  // Handle plan generation via Google Gemini API
  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      setError("Te rugăm să introduci o destinație (ex: Kyoto, Islanda, Coasta Amalfi).");
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const res = await fetch("/api/ai/travel-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destination.trim(),
          days,
          dates,
          style,
          withPartner,
          customPrompt: customPrompt.trim(),
          apiKey: apiKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.plan) {
        throw new Error(data.error || "Eroare la generarea planului");
      }

      setGeneratedPlan(data.plan);
    } catch (err: any) {
      console.error("Travel plan generation failed:", err);
      setError(err.message || "A apărut o problemă la comunicarea cu Gemini AI.");
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePackingItem = (id: string) => {
    if (!generatedPlan || !generatedPlan.packingList) return;
    const updated = generatedPlan.packingList.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setGeneratedPlan({ ...generatedPlan, packingList: updated });
  };

  const addCustomPackingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemText.trim() || !generatedPlan) return;
    const newItem: PackingItem = {
      id: `custom-${Date.now()}`,
      item: customItemText.trim(),
      category: "comfort",
      checked: false,
    };
    const list = [...(generatedPlan.packingList || []), newItem];
    setGeneratedPlan({ ...generatedPlan, packingList: list });
    setCustomItemText("");
  };

  const packingList = generatedPlan?.packingList || [];
  const packedCount = packingList.filter((p) => p.checked).length;
  const totalPackCount = packingList.length;
  const packingPercentage = totalPackCount > 0 ? Math.round((packedCount / totalPackCount) * 100) : 0;

  const filteredPackingItems = packingList.filter((item) => {
    if (packingCategoryFilter === "all") return true;
    return item.category === packingCategoryFilter;
  });

  // Save the generated plan to Atlas database as a PLANNED trip
  const handleSaveToAtlas = async () => {
    if (!generatedPlan) return;
    setIsSaving(true);
    setError(null);

    try {
      const now = new Date();
      const startDateIso = now.toISOString();

      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Călătorie: ${generatedPlan.destination}`,
          description: generatedPlan.summary,
          startDate: startDateIso,
          status: "PLANNED",
          minRole: "PARTNER",
          withPartner,
          partnerNotes: generatedPlan.partnerTips || null,
          latitude: generatedPlan.latitude,
          longitude: generatedPlan.longitude,
          planData: generatedPlan,
          photos: [],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.trip) {
        throw new Error(data.error || "Nu s-a putut salva călătoria");
      }

      // Convert response into frontend TripData
      const formattedTrip: TripData = {
        ...data.trip,
        year: now.getFullYear(),
        startDate: startDateIso,
        status: "PLANNED",
        latitude: generatedPlan.latitude,
        longitude: generatedPlan.longitude,
        planData: generatedPlan,
        photos: [],
        comments: [],
        allowedUserIds: [],
        isMaskedDate: false,
        isCountryShowcase: false,
      };

      onTripCreated(formattedTrip);
      onClose();
    } catch (err: any) {
      console.error("Save planned trip error:", err);
      setError(err.message || "Eroare la salvarea pe glob.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in pointer-events-auto overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="planner-modal-title"
        tabIndex={-1}
        className="relative w-full max-w-3xl my-auto glass-panel-glow rounded-3xl p-6 sm:p-7 border border-olive-500/30 shadow-2xl overflow-hidden focus:outline-none"
      >
        {/* Shimmering Top Bar Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-olive-600 via-olive-500 to-olive-400" />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Închide planificatorul Travel Assist"
          className="absolute top-5 right-5 p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-olive-500"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-1 text-olive-600 dark:text-olive-400">
          <div className="p-2 rounded-xl bg-olive-100 dark:bg-olive-950/80 border border-olive-300 dark:border-olive-500/30 text-olive-700 dark:text-olive-400 shadow-sm">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="planner-modal-title" className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Travel Assist — Planificator Călătorii (Gemini AI)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Creează itinerarii inteligente, obiective de vizitat și recomandări romantice pentru partener.
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-4 p-3.5 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* --- STEP 1: FORM INPUTS --- */}
        {!generatedPlan ? (
          <form onSubmit={handleGeneratePlan} className="space-y-4 mt-5">
            {/* Destination Input */}
            <div>
              <label htmlFor="planner-dest" className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400" aria-hidden="true" />
                Unde vrei să călătorești? (Destinație)
              </label>
              <input
                id="planner-dest"
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="ex: Kyoto & Nara, Japonia sau Coasta Amalfi, Italia..."
                className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500 transition-all shadow-xs"
              />
            </div>

            {/* Duration and Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="planner-duration" className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400" aria-hidden="true" />
                    Durată călătorie:
                  </span>
                  <span className="text-olive-900 dark:text-olive-300 font-bold px-2 py-0.5 rounded-lg bg-olive-100 dark:bg-olive-950/60 border border-olive-300 dark:border-olive-500/30">
                    {days} {days === 1 ? "zi" : "zile"}
                  </span>
                </label>
                <input
                  id="planner-duration"
                  type="range"
                  min={1}
                  max={21}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full accent-olive-600 cursor-pointer"
                />
              </div>

              <div>
                <label htmlFor="planner-dates" className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400" aria-hidden="true" />
                  Perioadă preconizată (lună sau date):
                </label>
                <input
                  id="planner-dates"
                  type="text"
                  value={dates}
                  onChange={(e) => setDates(e.target.value)}
                  placeholder="ex: Iunie 2025 sau 15-22 August..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500 transition-colors"
                />
              </div>
            </div>

            {/* Travel Style Selector */}
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 block" id="planner-style-label">
                Stilul călătoriei:
              </span>
              <div
                role="radiogroup"
                aria-labelledby="planner-style-label"
                className="grid grid-cols-2 sm:grid-cols-3 gap-2"
              >
                {TRAVEL_STYLES.map((s) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={style === s.id}
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all text-left focus:ring-2 focus:ring-olive-500 ${
                      style === s.id
                        ? "bg-olive-100 dark:bg-olive-700/30 border-olive-500 text-olive-900 dark:text-olive-200 shadow-sm font-bold"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span aria-hidden="true">{s.icon}</span>
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Travel with Partner Toggle Box */}
            <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500/40" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-xs font-bold text-rose-950 dark:text-rose-200 block">
                    Călătorie în Doi (cu Partenerul)
                  </span>
                  <span className="text-[11px] text-rose-700/80 dark:text-rose-300/70">
                    Gemini va include obiective romantice, apusuri, cine speciale și recomandări în doi.
                  </span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={withPartner}
                aria-label="Include recomandări pentru călătorie în doi cu partenerul"
                onClick={() => setWithPartner(!withPartner)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 focus:ring-2 focus:ring-rose-400 ${
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

            {/* Custom Notes / Preferences */}
            <div>
              <label htmlFor="planner-prompt" className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">
                Preferințe speciale sau dorințe (Opțional):
              </label>
              <textarea
                id="planner-prompt"
                rows={2}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="ex: Fără locuri prea aglomerate, ne plac cafenelele de specialitate, bărcile la apus și fotografia stradală..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-olive-500 transition-colors resize-none"
              />
            </div>

            {/* Custom Gemini API Key Collapsible */}
            <div>
              <button
                type="button"
                aria-expanded={showApiKeyInput}
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-olive-700 dark:hover:text-olive-300 flex items-center gap-1 transition-colors focus:ring-2 focus:ring-olive-500 rounded p-1"
              >
                <Key className="w-3 h-3" aria-hidden="true" />
                <span>{showApiKeyInput ? "Ascunde configurarea API Key" : "Configurează cheie proprie Google Gemini API (Opțional)"}</span>
              </button>
              {showApiKeyInput && (
                <div className="mt-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-1 animate-fade-in">
                  <label htmlFor="gemini-api-key" className="text-[11px] text-slate-600 dark:text-slate-400 block">Cheie API Gemini:</label>
                  <input
                    id="gemini-api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy... (dacă nu este setat în .env)"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-olive-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-olive-400 font-mono"
                  />
                  <p className="text-[10px] text-slate-500">
                    Dacă serverul are deja <code className="text-slate-600 dark:text-slate-400 font-semibold">GEMINI_API_KEY</code> în variabilele de mediu, lasă liber.
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-olive-700 to-olive-600 hover:from-olive-600 hover:to-olive-500 text-white font-bold text-sm transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 focus:ring-2 focus:ring-olive-400"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
                    <span>Gemini AI planifică călătoria...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-olive-200" aria-hidden="true" />
                    <span>Generează Planul de Călătorie cu Gemini</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* --- STEP 2: GENERATED PLAN PREVIEW --- */
          <div className="space-y-4 mt-5 animate-fade-in max-h-[70vh] overflow-y-auto pr-1">
            {/* Plan Header Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-olive-100 dark:from-olive-950/50 to-white dark:to-slate-900 border border-olive-400/40 dark:border-olive-600/40 shadow-md space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-olive-200/80 dark:bg-olive-900/60 text-olive-800 dark:text-olive-300">
                    <Compass className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">{generatedPlan.destination}</h3>
                    <p className="text-xs text-olive-800 dark:text-olive-300">
                      {generatedPlan.city}, {generatedPlan.country} • {generatedPlan.days} zile • {generatedPlan.style}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-olive-200 dark:bg-olive-900/70 text-olive-900 dark:text-olive-200 border border-olive-400/50">
                    {generatedPlan.allTargetCheckpoints.length} Obiective Țintă
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-200 italic leading-relaxed pt-1 pl-2 border-l-2 border-olive-500">
                „{generatedPlan.summary}”
              </p>
            </div>

            {/* Romantic Partner Tips (if withPartner) */}
            {generatedPlan.partnerTips && withPartner && (
              <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 space-y-1 animate-fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-950 dark:text-rose-300">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" aria-hidden="true" />
                  <span>Recomandări Speciale în Doi (Pentru Partener)</span>
                </div>
                <p className="text-xs text-rose-900/90 dark:text-rose-100/90 leading-relaxed italic">
                  {generatedPlan.partnerTips}
                </p>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800" role="tablist" aria-label="Opțiuni vizualizare plan">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "itinerary"}
                onClick={() => setActiveTab("itinerary")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "itinerary"
                    ? "bg-white dark:bg-olive-700 text-olive-900 dark:text-white shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60"
                }`}
              >
                <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Itinerar & Reper-uri</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "packing"}
                onClick={() => setActiveTab("packing")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "packing"
                    ? "bg-white dark:bg-olive-700 text-olive-900 dark:text-white shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60"
                }`}
              >
                <Luggage className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Bagaje ({packedCount}/{totalPackCount})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "weather"}
                onClick={() => setActiveTab("weather")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "weather"
                    ? "bg-white dark:bg-olive-700 text-olive-900 dark:text-white shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60"
                }`}
              >
                <CloudSun className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Vreme & Ponturi</span>
              </button>
            </div>

            {/* TAB 1: ITINERARY & CHECKPOINTS */}
            {activeTab === "itinerary" && (
              <div className="space-y-4 animate-fade-in">
                {/* Target Checkpoints Checklist */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-olive-700 dark:text-olive-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                      Obiective & Reper-uri de Fotografiat (Checklist AI)
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      AI le va verifica automat când încarci pozele!
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {generatedPlan.allTargetCheckpoints.map((cp, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="leading-snug">{cp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Itinerary Day-by-Day Cards */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400" aria-hidden="true" />
                    Itinerariu Detaliat pe Zile:
                  </span>

                  {generatedPlan.itinerary.map((day) => (
                    <div
                      key={day.dayNumber}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-olive-500/40 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-olive-100 dark:bg-olive-900/80 text-olive-900 dark:text-olive-300 flex items-center justify-center text-[10px] font-black border border-olive-300 dark:border-olive-500/40">
                            {day.dayNumber}
                          </span>
                          {day.title}
                        </h4>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-7">
                        {day.description}
                      </p>

                      {day.highlights && day.highlights.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pl-7 pt-1">
                          {day.highlights.map((hl, hidx) => (
                            <span
                              key={hidx}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-olive-800 dark:text-olive-300 border border-olive-500/30"
                            >
                              ✦ {hl}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: PACKING ASSISTANT */}
            {activeTab === "packing" && (
              <div className="space-y-4 animate-fade-in">
                {/* Packing Progress Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-olive-50 dark:from-olive-950/40 to-slate-50 dark:to-slate-900 border border-olive-200 dark:border-olive-600/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Luggage className="w-4 h-4 text-olive-600 dark:text-olive-400" aria-hidden="true" />
                      Progres Împachetare Bagaj:
                    </span>
                    <span className="font-mono font-bold text-olive-800 dark:text-olive-300">
                      {packedCount} din {totalPackCount} ({packingPercentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-olive-600 to-olive-400 transition-all duration-300 rounded-full"
                      style={{ width: `${packingPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Category Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { id: "all", label: "Toate Obiectele" },
                    { id: "clothing", label: "👕 Îmbrăcăminte" },
                    { id: "gear", label: "🔌 Echipament & Foto" },
                    { id: "documents", label: "📄 Documente & Bani" },
                    { id: "comfort", label: "🧴 Confort & Sănătate" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPackingCategoryFilter(cat.id)}
                      className={`text-[11px] font-bold px-3 py-1 rounded-xl whitespace-nowrap transition-all ${
                        packingCategoryFilter === cat.id
                          ? "bg-olive-700 text-white shadow-sm"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Checklist Items */}
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {filteredPackingItems.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 text-center">Niciun obiect în această categorie.</p>
                  ) : (
                    filteredPackingItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => togglePackingItem(item.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all text-left group ${
                          item.checked
                            ? "bg-olive-50 dark:bg-olive-950/40 border-olive-300 dark:border-olive-700/50 text-slate-400 dark:text-slate-400 line-through opacity-80"
                            : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-olive-500/40 text-slate-800 dark:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {item.checked ? (
                            <CheckSquare className="w-4 h-4 text-olive-600 dark:text-olive-400 shrink-0" aria-hidden="true" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 group-hover:text-olive-600 dark:group-hover:text-olive-400 shrink-0" aria-hidden="true" />
                          )}
                          <span>{item.item}</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.category === "clothing" && "Haine"}
                          {item.category === "gear" && "Tech/Foto"}
                          {item.category === "documents" && "Acte"}
                          {item.category === "comfort" && "Confort"}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                {/* Add Custom Packing Item */}
                <form onSubmit={addCustomPackingItem} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customItemText}
                    onChange={(e) => setCustomItemText(e.target.value)}
                    placeholder="Adaugă alt obiect în bagaj..."
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500"
                  />
                  <button
                    type="submit"
                    disabled={!customItemText.trim()}
                    className="px-3.5 py-2 rounded-xl bg-olive-700 hover:bg-olive-800 text-white font-bold text-xs flex items-center gap-1 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Adaugă</span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: WEATHER & LOCAL TIPS */}
            {activeTab === "weather" && (
              <div className="space-y-4 animate-fade-in">
                {/* Weather Forecast Card */}
                {generatedPlan.weatherForecastSummary && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 dark:from-amber-950/30 to-slate-50 dark:to-slate-900 border border-amber-200 dark:border-amber-800/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <CloudSun className="w-4 h-4 text-amber-500 dark:text-amber-400" aria-hidden="true" />
                        Climat & Temperaturi Estimate:
                      </span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/50">
                        {generatedPlan.weatherForecastSummary.tempRange}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed italic">
                      {generatedPlan.weatherForecastSummary.description}
                    </p>
                  </div>
                )}

                {/* Local Tips Grid */}
                {generatedPlan.localTips && generatedPlan.localTips.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider block">
                      Ponturi Practice & Recomandări Locale:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {generatedPlan.localTips.map((tip, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
                          <h5 className="text-xs font-bold text-olive-800 dark:text-olive-300 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-olive-600 dark:text-olive-400" aria-hidden="true" />
                            {tip.title}
                          </h5>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                            {tip.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Save to Atlas Button Bar */}
            <div className="pt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setGeneratedPlan(null)}
                className="py-3 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-300 transition-colors focus:ring-2 focus:ring-slate-400"
              >
                Modifică Criteriile
              </button>

              <button
                type="button"
                onClick={handleSaveToAtlas}
                disabled={isSaving}
                className="flex-1 py-3 px-4 rounded-xl bg-olive-700 hover:bg-olive-800 text-white font-bold text-xs transition-all shadow-sm hover:scale-[1.01] flex items-center justify-center gap-2 disabled:opacity-50 focus:ring-2 focus:ring-olive-400"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
                    <span>Se plasează pe Globul Terestru...</span>
                  </>
                ) : (
                  <>
                    <Globe2 className="w-4 h-4 text-olive-200" aria-hidden="true" />
                    <span>Plasează Pinul pe Glob (Salvează în Atlas)</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 text-olive-200" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
