import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateTravelPlan } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "PARTNER")) {
      return NextResponse.json(
        { error: "Only administrator or partner can use Travel Assist" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      destination,
      days = 5,
      dates = "Soon",
      style = "Discovery & Adventure",
      withPartner = true,
      customPrompt = "",
      apiKey,
    } = body;

    if (!destination || typeof destination !== "string") {
      return NextResponse.json(
        { error: "Destination is required" },
        { status: 400 }
      );
    }

    const plan = await generateTravelPlan({
      destination: destination.trim(),
      days: Number(days),
      dates: String(dates),
      style: String(style),
      withPartner: Boolean(withPartner),
      customPrompt: String(customPrompt || ""),
      apiKey: apiKey ? String(apiKey).trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error("Generate travel plan error:", error);
    return NextResponse.json(
      { error: "Failed to generate travel plan" },
      { status: 500 }
    );
  }
}
