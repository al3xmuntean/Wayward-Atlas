import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { translateTripContent } from "@/lib/gemini";
import { Language } from "@/lib/i18n/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can translate travel content" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, description = "", targetLang, all = false } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required for translation" },
        { status: 400 }
      );
    }

    // Translate to all 4 target languages at once
    if (all) {
      const languages: Language[] = ["en", "de", "es", "fr"];
      const results: Record<string, { title: string; description: string }> = {};

      await Promise.all(
        languages.map(async (lang) => {
          const res = await translateTripContent({
            title: title.trim(),
            description: description?.trim() || "",
            targetLang: lang,
          });
          results[lang] = res;
        })
      );

      return NextResponse.json({ success: true, translations: results });
    }

    // Translate to single target language
    if (!targetLang || typeof targetLang !== "string") {
      return NextResponse.json(
        { error: "targetLang is required when all is false" },
        { status: 400 }
      );
    }

    const result = await translateTripContent({
      title: title.trim(),
      description: description?.trim() || "",
      targetLang: targetLang.trim().toLowerCase(),
    });

    return NextResponse.json({
      success: true,
      targetLang,
      translation: result,
    });
  } catch (error: any) {
    console.error("Translation API error:", error);
    return NextResponse.json(
      { error: "Failed to translate content", details: error?.message },
      { status: 500 }
    );
  }
}
