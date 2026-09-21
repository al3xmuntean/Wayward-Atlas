import React from "react";
import { Language } from "@/lib/i18n/types";

interface FlagIconProps {
  code: Language;
  className?: string;
}

export const FlagIcon: React.FC<FlagIconProps> = ({ code, className = "w-4 h-3 rounded-[3px] inline-block shrink-0 shadow-xs object-cover" }) => {
  switch (code) {
    case "ro":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <g fillRule="evenodd" strokeWidth="1pt">
            <path fill="#002B7F" d="M0 0h213.3v480H0z" />
            <path fill="#FCD116" d="M213.3 0h213.4v480H213.3z" />
            <path fill="#CE1126" d="M426.7 0H640v480H426.7z" />
          </g>
        </svg>
      );
    case "en":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <path fill="#012169" d="M0 0h640v480H0z" />
          <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-179L0 64V0h75z" />
          <path fill="#C8102E" d="m424 288 216 159v33h-44L366 316l58-28zM640 23v7L434 241l15 31 191-142V23zM0 457v23h44l220-164-15-31L0 457zM216 192 0 33V0h44l230 164-58 28z" />
          <path fill="#FFF" d="M240 0h160v480H240zM0 160h640v160H0z" />
          <path fill="#C8102E" d="M272 0h96v480h-96zM0 192h640v96H0z" />
        </svg>
      );
    case "de":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <path fill="#000" d="M0 0h640v160H0z" />
          <path fill="#DD0000" d="M0 160h640v160H0z" />
          <path fill="#FFCE00" d="M0 320h640v160H0z" />
        </svg>
      );
    case "es":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <path fill="#AA151B" d="M0 0h640v120H0zm0 360h640v120H0z" />
          <path fill="#F1BF00" d="M0 120h640v240H0z" />
          <circle cx="160" cy="240" r="28" fill="#AA151B" opacity="0.85" />
          <circle cx="160" cy="240" r="20" fill="#F1BF00" />
        </svg>
      );
    case "fr":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <g fillRule="evenodd" strokeWidth="1pt">
            <path fill="#002395" d="M0 0h213.3v480H0z" />
            <path fill="#FFF" d="M213.3 0h213.4v480H213.3z" />
            <path fill="#ED2939" d="M426.7 0H640v480H426.7z" />
          </g>
        </svg>
      );
    default:
      return null;
  }
};
