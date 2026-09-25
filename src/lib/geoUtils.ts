/**
 * Utility functions for resolving client IP and geo-location attributes
 */

export function extractClientGeo(request: Request): {
  ip: string;
  countryCode: string | null;
  countryName: string;
  flag: string;
  userAgent: string | null;
} {
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  const xForwardedFor = request.headers.get("x-forwarded-for");
  const xRealIp = request.headers.get("x-real-ip");

  let rawIp =
    cfConnectingIp ||
    (xForwardedFor ? xForwardedFor.split(",")[0].trim() : null) ||
    xRealIp ||
    "127.0.0.1";

  // Normalize IPv6-mapped IPv4 like ::ffff:192.168.1.1
  if (rawIp.startsWith("::ffff:")) {
    rawIp = rawIp.replace("::ffff:", "");
  }

  // Cloudflare Tunnel provides cf-ipcountry header:
  const cfCountry = request.headers.get("cf-ipcountry");
  const countryCode =
    cfCountry && cfCountry.length === 2 && cfCountry !== "XX" && cfCountry !== "T1"
      ? cfCountry.toUpperCase()
      : null;

  const flag = isoToFlagEmoji(countryCode);
  const countryName = resolveCountryName(countryCode);
  const userAgent = request.headers.get("user-agent") || null;

  return {
    ip: rawIp,
    countryCode,
    countryName,
    flag,
    userAgent,
  };
}

/**
 * Converts any 2-letter ISO country code to an emoji flag
 */
export function isoToFlagEmoji(iso2?: string | null): string {
  if (!iso2 || iso2.length !== 2) return "🌐";
  const upper = iso2.toUpperCase();
  // Regional indicator symbols start at 0x1F1E6 for 'A'
  const first = 127397 + upper.charCodeAt(0);
  const second = 127397 + upper.charCodeAt(1);
  return String.fromCodePoint(first, second);
}

const FALLBACK_COUNTRY_NAMES: Record<string, string> = {
  RO: "România",
  IT: "Italia",
  ES: "Spania",
  FR: "Franța",
  DE: "Germania",
  AT: "Austria",
  HU: "Ungaria",
  GR: "Grecia",
  US: "Statele Unite",
  GB: "Regatul Unit",
  JP: "Japonia",
  CH: "Elveția",
  NO: "Norvegia",
  IS: "Islanda",
  PT: "Portugalia",
  HR: "Croația",
  TR: "Turcia",
};

/**
 * Resolves country code to localized name (Romanian/English)
 */
export function resolveCountryName(countryCode?: string | null, locale = "ro"): string {
  if (!countryCode) return "Local / Privat";
  const code = countryCode.toUpperCase();

  if (FALLBACK_COUNTRY_NAMES[code]) {
    return FALLBACK_COUNTRY_NAMES[code];
  }

  try {
    const regionNames = new Intl.DisplayNames([locale, "en"], { type: "region" });
    const name = regionNames.of(code);
    if (name) return name;
  } catch {
    // ignore
  }

  return code;
}
