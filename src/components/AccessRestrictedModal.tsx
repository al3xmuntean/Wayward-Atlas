"use client";

import React, { useRef } from "react";
import { ShieldAlert, LogIn, X, Lock } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { useModalA11y } from "@/hooks/useModalA11y";

interface AccessRestrictedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
  errorCode: "AUTH_REQUIRED" | "FORBIDDEN" | "NOT_FOUND" | null;
  requiredRole?: string;
  itemTitle?: string;
}

export const AccessRestrictedModal: React.FC<AccessRestrictedModalProps> = ({
  isOpen,
  onClose,
  onOpenLogin,
  errorCode,
  requiredRole,
  itemTitle,
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  useModalA11y({
    isOpen,
    onClose,
    modalRef,
  });

  if (!isOpen) return null;

  const isAuthRequired = errorCode === "AUTH_REQUIRED";
  const isForbidden = errorCode === "FORBIDDEN";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md glass-panel rounded-3xl p-6 border border-amber-500/30 shadow-2xl space-y-5 animate-scale-up"
      >
        {/* Header Icon & Close */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
            {isAuthRequired ? (
              <Lock className="w-6 h-6" aria-hidden="true" />
            ) : (
              <ShieldAlert className="w-6 h-6" aria-hidden="true" />
            )}
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h2
            id="access-modal-title"
            className="text-lg font-black text-slate-900 dark:text-white tracking-tight"
          >
            {t("share.unauthorizedTitle")}
          </h2>
          {itemTitle && (
            <p className="text-xs font-bold text-olive-600 dark:text-olive-400 truncate">
              « {itemTitle} »
            </p>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {isAuthRequired
              ? t("share.loginRequired")
              : isForbidden
              ? t("share.unauthorizedMessage")
              : "Resursa solicitată nu a fost găsită sau linkul a expirat."}
          </p>

          {requiredRole && (
            <div className="inline-block px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[11px] font-bold text-amber-700 dark:text-amber-300">
              {t("share.unauthorizedRoleRequired", { role: requiredRole })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          {isAuthRequired && (
            <button
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-olive-700 hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 text-white font-bold text-xs shadow-md transition-all hover:scale-105"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>{t("share.loginButton")}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className={`py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all ${
              isAuthRequired ? "" : "flex-1"
            }`}
          >
            {t("share.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
};
