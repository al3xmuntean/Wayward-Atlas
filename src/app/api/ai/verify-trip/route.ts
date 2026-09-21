import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyTripAgainstPlan } from "@/lib/gemini";
import { TravelPlanData } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "PARTNER")) {
      return NextResponse.json(
        { error: "Only administrator or partner can verify trips" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { tripId, apiKey } = body;

    if (!tripId) {
      return NextResponse.json({ error: "Trip ID is required" }, { status: 400 });
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        photos: {
          orderBy: { takenAt: "asc" },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (!trip.planData) {
      return NextResponse.json(
        { error: "This trip does not have a structured travel plan to verify against" },
        { status: 400 }
      );
    }

    let parsedPlan: TravelPlanData;
    try {
      parsedPlan = JSON.parse(trip.planData);
    } catch {
      return NextResponse.json({ error: "Failed to parse trip plan data" }, { status: 500 });
    }

    const photoSummaries = trip.photos.map((p) => {
      let tags: string[] = [];
      try {
        tags = JSON.parse(p.tags);
      } catch {
        tags = [];
      }
      return {
        placeName: p.placeName,
        city: p.city,
        country: p.country,
        tags,
        takenAt: p.takenAt.toISOString(),
        url: p.url,
      };
    });

    const report = await verifyTripAgainstPlan({
      tripTitle: trip.title,
      plan: parsedPlan,
      photos: photoSummaries,
      apiKey: apiKey ? String(apiKey).trim() : undefined,
    });

    // Update trip in database: mark status as COMPLETED, save achievementReport, evocative description and partnerNotes
    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: "COMPLETED",
        achievementReport: JSON.stringify(report),
        description: trip.description || report.summaryText,
        partnerNotes: trip.partnerNotes || (report.partnerMemory ? report.partnerMemory : null),
      },
    });

    return NextResponse.json({
      success: true,
      report,
      trip: updatedTrip,
    });
  } catch (error) {
    console.error("Verify trip error:", error);
    return NextResponse.json(
      { error: "Failed to verify trip against plan" },
      { status: 500 }
    );
  }
}
