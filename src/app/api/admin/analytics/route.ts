import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isoToFlagEmoji, resolveCountryName } from "@/lib/geoUtils";
import {
  PhotoAnalyticsItem,
  IpAnalyticsItem,
  CountryAnalyticsItem,
  AnalyticsSummary,
} from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const authCheck = await requireAdmin();
    if (authCheck.errorResponse) {
      return authCheck.errorResponse;
    }

    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get("timeRange") || "all"; // '24h', '7d', '30d', 'all'
    const sortBy = searchParams.get("sortBy") || "views_desc";
    const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();

    // Determine start date filter
    let dateFilter: Date | undefined;
    const now = Date.now();
    if (timeRange === "24h") {
      dateFilter = new Date(now - 24 * 60 * 60 * 1000);
    } else if (timeRange === "7d") {
      dateFilter = new Date(now - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "30d") {
      dateFilter = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    const viewsWhereClause = dateFilter ? { createdAt: { gte: dateFilter } } : undefined;

    // Fetch all photos with their trip metadata and views matching the time window
    const photosRaw = await prisma.photo.findMany({
      include: {
        trip: {
          select: {
            id: true,
            title: true,
          },
        },
        views: {
          where: viewsWhereClause,
          select: {
            id: true,
            ip: true,
            country: true,
            countryCode: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Maps for global aggregations
    const ipMap = new Map<
      string,
      {
        ip: string;
        country: string | null;
        countryCode: string | null;
        flag: string;
        totalViews: number;
        distinctPhotos: Set<string>;
        lastSeenAt: Date;
        photoTitles: Set<string>;
      }
    >();

    const countryMap = new Map<
      string,
      {
        country: string;
        countryCode: string;
        flag: string;
        totalViews: number;
        uniqueIps: Set<string>;
      }
    >();

    let totalGlobalViews = 0;
    const globalUniqueIps = new Set<string>();

    const processedPhotos: PhotoAnalyticsItem[] = [];

    for (const p of photosRaw) {
      // Check search filter if given
      if (searchQuery) {
        const matchesPlace = (p.placeName || "").toLowerCase().includes(searchQuery);
        const matchesCountry = (p.country || "").toLowerCase().includes(searchQuery);
        const matchesTrip = p.trip.title.toLowerCase().includes(searchQuery);
        if (!matchesPlace && !matchesCountry && !matchesTrip) {
          continue;
        }
      }

      const views = p.views;
      const photoTotalViews = views.length;
      totalGlobalViews += photoTotalViews;

      const photoUniqueIps = new Set<string>();
      let photoLastViewed: Date | null = null;
      const photoCountryCounter = new Map<string, number>();

      for (const v of views) {
        photoUniqueIps.add(v.ip);
        globalUniqueIps.add(v.ip);

        if (!photoLastViewed || v.createdAt > photoLastViewed) {
          photoLastViewed = v.createdAt;
        }

        const cCode = v.countryCode?.toUpperCase() || "UNKNOWN";
        photoCountryCounter.set(cCode, (photoCountryCounter.get(cCode) || 0) + 1);

        // Aggregate IP logs
        const displayPhotoTitle = p.placeName || p.trip.title || "Fotografie";
        const existingIp = ipMap.get(v.ip);
        if (existingIp) {
          existingIp.totalViews += 1;
          existingIp.distinctPhotos.add(p.id);
          existingIp.photoTitles.add(displayPhotoTitle);
          if (v.createdAt > existingIp.lastSeenAt) {
            existingIp.lastSeenAt = v.createdAt;
          }
        } else {
          ipMap.set(v.ip, {
            ip: v.ip,
            country: v.country || resolveCountryName(v.countryCode),
            countryCode: v.countryCode,
            flag: isoToFlagEmoji(v.countryCode),
            totalViews: 1,
            distinctPhotos: new Set([p.id]),
            lastSeenAt: v.createdAt,
            photoTitles: new Set([displayPhotoTitle]),
          });
        }

        // Aggregate Country stats
        const normCountryCode = v.countryCode?.toUpperCase() || "XX";
        const existingCountry = countryMap.get(normCountryCode);
        if (existingCountry) {
          existingCountry.totalViews += 1;
          existingCountry.uniqueIps.add(v.ip);
        } else {
          countryMap.set(normCountryCode, {
            country: v.country || resolveCountryName(v.countryCode),
            countryCode: normCountryCode,
            flag: isoToFlagEmoji(v.countryCode),
            totalViews: 1,
            uniqueIps: new Set([v.ip]),
          });
        }
      }

      // Top countries for this photo
      const topCountries = Array.from(photoCountryCounter.entries())
        .map(([code, count]) => ({
          countryCode: code,
          country: resolveCountryName(code === "UNKNOWN" ? null : code),
          flag: isoToFlagEmoji(code === "UNKNOWN" ? null : code),
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      processedPhotos.push({
        id: p.id,
        tripId: p.tripId,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl,
        placeName: p.placeName,
        country: p.country,
        tripTitle: p.trip.title,
        totalViews: photoTotalViews,
        distinctViews: photoUniqueIps.size,
        lastViewedAt: photoLastViewed ? photoLastViewed.toISOString() : null,
        topCountries,
      });
    }

    // Sort photos according to requested sortBy
    processedPhotos.sort((a, b) => {
      switch (sortBy) {
        case "views_asc":
          return a.totalViews - b.totalViews;
        case "unique_desc":
          return b.distinctViews - a.distinctViews;
        case "unique_asc":
          return a.distinctViews - b.distinctViews;
        case "newest":
          return (
            new Date(b.lastViewedAt || 0).getTime() -
            new Date(a.lastViewedAt || 0).getTime()
          );
        case "title":
          return (a.placeName || a.tripTitle).localeCompare(
            b.placeName || b.tripTitle
          );
        case "views_desc":
        default:
          return b.totalViews - a.totalViews;
      }
    });

    // Format IP logs
    const ipLogs: IpAnalyticsItem[] = Array.from(ipMap.values())
      .map((entry) => ({
        ip: entry.ip,
        country: entry.country,
        countryCode: entry.countryCode,
        flag: entry.flag,
        totalViews: entry.totalViews,
        distinctPhotosCount: entry.distinctPhotos.size,
        lastSeenAt: entry.lastSeenAt.toISOString(),
        photoTitles: Array.from(entry.photoTitles).slice(0, 5),
      }))
      .sort((a, b) => b.totalViews - a.totalViews);

    // Format Country statistics
    const countryStats: CountryAnalyticsItem[] = Array.from(countryMap.values())
      .map((entry) => ({
        country: entry.country,
        countryCode: entry.countryCode,
        flag: entry.flag,
        totalViews: entry.totalViews,
        uniqueIpsCount: entry.uniqueIps.size,
        percentage:
          totalGlobalViews > 0
            ? Number(((entry.totalViews / totalGlobalViews) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.totalViews - a.totalViews);

    const topCountryEntry = countryStats.length > 0 ? countryStats[0] : null;

    const summary: AnalyticsSummary = {
      totalViews: totalGlobalViews,
      distinctVisitorsCount: globalUniqueIps.size,
      totalPhotosTracked: processedPhotos.filter((p) => p.totalViews > 0).length,
      topCountry: topCountryEntry
        ? {
            name: topCountryEntry.country,
            flag: topCountryEntry.flag,
            views: topCountryEntry.totalViews,
          }
        : null,
      photos: processedPhotos,
      ipLogs,
      countryStats,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error generating admin analytics:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
