import { AILocationSuggestion } from "./types";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

/**
 * Geocode text using OpenStreetMap Nominatim (free, open-source).
 */
export async function geocodeLocation(query: string): Promise<AILocationSuggestion[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&addressdetails=1&limit=5`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "WaywardAtlas/1.0 (travel-journal-map)",
      },
    });

    if (!res.ok) return [];

    const data: NominatimResult[] = await res.json();
    return data.map((item, idx) => ({
      placeName: item.display_name.split(",")[0].trim(),
      city: item.address?.city || item.address?.town || item.address?.village || item.address?.state,
      country: item.address?.country,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      confidence: Math.max(0.6, 0.95 - idx * 0.1),
      source: "nominatim",
      reasoning: item.display_name,
    }));
  } catch (error) {
    console.error("Geocoding error:", error);
    return [];
  }
}

/**
 * Reverse geocode latitude and longitude to get city, country and place name.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<{
  placeName: string;
  city: string;
  country: string;
} | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "WaywardAtlas/1.0 (travel-journal-map)",
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const city =
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.county ||
      "Necunoscut";
    const country = data.address?.country || "Planet Earth";
    const placeName = data.name || data.display_name.split(",")[0] || `${city}, ${country}`;

    return { placeName, city, country };
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}

/**
 * Identify location from an image base64 or description using local LM Studio / Vision LLM.
 */
export async function suggestLocationFromAI(
  imageBase64?: string,
  imageDescription?: string
): Promise<AILocationSuggestion[]> {
  const localAIUrl = process.env.LOCAL_AI_URL || "http://localhost:1234/v1";

  // Try local LM Studio / Ollama / OpenAI vision compatible endpoint
  try {
    const messages: Array<{ role: string; content: string | Array<Record<string, unknown>> }> = [
      {
        role: "system",
        content: `Ești un asistent expert în recunoașterea reperelor turistice și geolocalizare din fotografii.
Răspunde STRICT cu un JSON valid (fără markdown înconjurător) cu următorul format:
{
  "candidates": [
    {
      "placeName": "Nume reper sau oraș",
      "city": "Oraș",
      "country": "Țară",
      "searchQuery": "Text pentru geocodare pe hartă",
      "confidence": 0.85,
      "reasoning": "De ce crezi că este această locație (elemente vizuale recunoscute)"
    }
  ]
}`,
      },
    ];

    if (imageBase64) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: "Identifică locația geografică, orașul, țara și reperul din această fotografie de călătorie. Unde a fost făcută poza?",
          },
          {
            type: "image_url",
            image_url: {
              url: imageBase64.startsWith("data:")
                ? imageBase64
                : `data:image/jpeg;base64,${imageBase64}`,
            },
          },
        ],
      });
    } else if (imageDescription) {
      messages.push({
        role: "user",
        content: `Unde se află următoarea locație descrisă din poză: "${imageDescription}"?`,
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout for local LLM

    const response = await fetch(`${localAIUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "default", // uses whatever vision model is loaded in LM Studio
        messages,
        temperature: 0.2,
      }),
    });

    clearTimeout(timeout);

    if (response.ok) {
      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;
      if (content) {
        // Clean JSON string in case model added codeblocks
        const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.candidates && Array.isArray(parsed.candidates)) {
          const suggestions: AILocationSuggestion[] = [];
          for (const cand of parsed.candidates) {
            const geocoded = await geocodeLocation(cand.searchQuery || `${cand.placeName}, ${cand.country}`);
            if (geocoded.length > 0) {
              suggestions.push({
                ...geocoded[0],
                placeName: cand.placeName || geocoded[0].placeName,
                confidence: cand.confidence || 0.85,
                source: "local-llm",
                reasoning: cand.reasoning,
              });
            }
          }
          if (suggestions.length > 0) return suggestions;
        }
      }
    }
  } catch (error) {
    console.log("Local LM Studio not active or vision model not loaded, falling back to geocoding.");
  }

  // Fallback: If image description was passed, geocode directly
  if (imageDescription) {
    return geocodeLocation(imageDescription);
  }

  return [];
}
