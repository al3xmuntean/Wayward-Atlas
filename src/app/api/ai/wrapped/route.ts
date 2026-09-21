import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { generateAnnualWrapped } from "@/lib/gemini";
import { HOME_BASE_SIBIU } from "@/lib/distance";

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit("wrapped", clientIp, 15, 60000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Please try again in ${rateLimit.resetInSeconds} seconds.` },
        { status: 429 }
      );
    }

    const user = await getCurrentUser();
    const body = await req.json().catch(() => ({}));
    const {
      year = new Date().getFullYear(),
      totalKm = 0,
      tripsCount = 0,
      countries = [],
      cities = [],
      topTripTitle,
      withPartnerCount = 0,
      apiKey,
    } = body;

    const wrapped = await generateAnnualWrapped({
      year: Number(year) || new Date().getFullYear(),
      totalKm: Number(totalKm) || 0,
      tripsCount: Number(tripsCount) || 0,
      countries: Array.isArray(countries) ? countries : [],
      cities: Array.isArray(cities) ? cities : [],
      topTripTitle: topTripTitle ? String(topTripTitle).slice(0, 100) : undefined,
      withPartnerCount: Number(withPartnerCount) || 0,
      apiKey: apiKey ? String(apiKey).trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      origin: HOME_BASE_SIBIU.name,
      userRole: user?.role || "PUBLIC",
      wrapped,
    });
  } catch (error) {
    console.error("Generate Atlas Wrapped error:", error);
    return NextResponse.json(
      { error: "Failed to generate annual travel recap" },
      { status: 500 }
    );
  }
}
