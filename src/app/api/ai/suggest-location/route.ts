import { NextRequest, NextResponse } from "next/server";
import { suggestLocationFromAI, geocodeLocation, reverseGeocode } from "@/lib/ai-vision";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Doar administratorul poate solicita sugestii AI" }, { status: 403 });
    }

    const { imageBase64, query, lat, lon } = await req.json();

    // If coordinates are provided, do reverse geocode
    if (typeof lat === "number" && typeof lon === "number") {
      const info = await reverseGeocode(lat, lon);
      return NextResponse.json({ location: info });
    }

    // If text query provided, geocode
    if (query && query.trim()) {
      const results = await geocodeLocation(query.trim());
      return NextResponse.json({ suggestions: results });
    }

    // If imageBase64 provided, use AI Vision analysis
    if (imageBase64) {
      const suggestions = await suggestLocationFromAI(imageBase64);
      return NextResponse.json({ suggestions });
    }

    return NextResponse.json({ suggestions: [] });
  } catch (error) {
    console.error("AI location suggestion error:", error);
    return NextResponse.json({ error: "Eroare la obținerea sugestiilor AI" }, { status: 500 });
  }
}
