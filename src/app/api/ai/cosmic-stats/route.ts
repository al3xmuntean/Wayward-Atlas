import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateCosmicTravelTrivia } from "@/lib/gemini";
import { HOME_BASE_SIBIU } from "@/lib/distance";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const role = user?.role || "PUBLIC";

    const body = await req.json().catch(() => ({}));
    const {
      totalKm = 0,
      equatorLaps = 0,
      tripsCount = 0,
      countries = [],
      topDestinations = [],
      partnerTripsCount = 0,
      apiKey,
    } = body;

    const trivia = await generateCosmicTravelTrivia({
      totalKm: Number(totalKm) || 0,
      equatorLaps: Number(equatorLaps) || 0,
      tripsCount: Number(tripsCount) || 0,
      countries: Array.isArray(countries) ? countries : [],
      role,
      topDestinations: Array.isArray(topDestinations) ? topDestinations : [],
      partnerTripsCount: Number(partnerTripsCount) || 0,
      apiKey: apiKey ? String(apiKey).trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      origin: HOME_BASE_SIBIU.name,
      role,
      trivia,
    });
  } catch (error) {
    console.error("Generate cosmic stats error:", error);
    return NextResponse.json(
      { error: "Failed to generate cosmic travel trivia" },
      { status: 500 }
    );
  }
}
