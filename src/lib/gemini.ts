import { GoogleGenerativeAI } from "@google/generative-ai";
import { geocodeLocation } from "./ai-vision";
import { TravelPlanData, TravelAchievementReport } from "./types";

interface GeneratePlanParams {
  destination: string;
  days?: number;
  dates?: string;
  style?: string;
  withPartner?: boolean;
  customPrompt?: string;
  apiKey?: string;
}

interface VerifyTripParams {
  tripTitle: string;
  plan: TravelPlanData;
  photos: Array<{
    placeName?: string | null;
    city?: string | null;
    country?: string | null;
    tags: string[];
    takenAt: string;
    url?: string;
  }>;
  apiKey?: string;
}

/**
 * Candidate models supported by Gemini API in order of preference
 */
const CANDIDATE_GEMINI_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.8-flash",
  "gemma-4-26b-a4b-it",
  "gemma-4-31b-it",
  "gemini-flash-latest",
];

/**
 * Helper to get a Gemini GenerativeModel instance
 */
function getGeminiModel(apiKey?: string, modelName: string = CANDIDATE_GEMINI_MODELS[0]) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return null;
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({ model: modelName }, { timeout: 15000 });
}

/**
 * Fast and reliable multilingual translation fallback using Google's public translate service
 */
async function fastTranslate(text: string, targetLang: string): Promise<string> {
  if (!text || !text.trim()) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return text;
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map((item: any) => item[0]).join("");
    }
  } catch (e) {
    console.warn(`[fastTranslate] fallback failed for ${targetLang}:`, e);
  }
  return text;
}

/**
 * Generate a structured travel itinerary and target checkpoints using Google Gemini
 */
export async function generateTravelPlan(params: GeneratePlanParams): Promise<TravelPlanData & { latitude: number; longitude: number }> {
  const { destination, days = 5, dates = "Soon", style = "Discovery & Adventure", withPartner = true, customPrompt = "", apiKey } = params;

  // 1. Resolve coordinates for the destination pin on the 3D globe
  const geocodedList = await geocodeLocation(destination);
  let latitude = 48.8566;
  let longitude = 2.3522;
  let detectedCity = destination;
  let detectedCountry = "Global";

  if (geocodedList.length > 0) {
    latitude = geocodedList[0].latitude;
    longitude = geocodedList[0].longitude;
    detectedCity = geocodedList[0].city || geocodedList[0].placeName;
    detectedCountry = geocodedList[0].country || "Global";
  }

  const model = getGeminiModel(apiKey);

  if (model) {
    try {
      const prompt = `You are an elite, romantic, and adventurous AI travel planner for "Wayward Atlas".
Create a detailed, inspiring, and achievable ${days}-day travel plan for: "${destination}".
Context:
- Travel duration: ${days} days.
- Target timeframe: ${dates}.
- Travel style: ${style}.
- Traveling with partner: ${withPartner ? "YES, traveling with my partner (include romantic viewpoints, cozy cafés, couple activities, and sunset spots)" : "NO"}.
${customPrompt ? `- Custom notes / preferences: ${customPrompt}` : ""}

STRICT REQUIREMENT: Respond ONLY with a valid JSON object in Romanian (no markdown surrounding ticks, no commentary before or after). Format:
{
  "destination": "${destination}",
  "city": "${detectedCity}",
  "country": "${detectedCountry}",
  "days": ${days},
  "style": "${style}",
  "summary": "O descriere captivantă de 2-3 propoziții a acestei călătorii.",
  "partnerTips": "Sugestii speciale în doi: puncte de panoramă romantice, bistrouri intime sau momente de aur la apus.",
  "allTargetCheckpoints": [
    "Reper specific 1",
    "Reper specific 2",
    "Activitate sau belvedere 3",
    "Experiență culinară locală 4",
    "Obiectiv sau punct scenic 5"
  ],
  "weatherForecastSummary": {
    "tempRange": "16°C - 24°C",
    "description": "Vreme blândă și predominant însorită, cu seri răcoroase ideale pentru plimbări."
  },
  "localTips": [
    { "title": "Monedă & Plăți", "detail": "Cardurile sunt acceptate pe scară largă; recomandat 20-30€ numerar pentru piețe mici." },
    { "title": "Electricitate & Prize", "detail": "Prize standard europene (230V, Tip C/F), nu este necesar adaptor special." },
    { "title": "Pont Local", "detail": "Savurați specialitățile locale la prânz în trattorii sau bistrouri frecventate de localnici." }
  ],
  "packingList": [
    { "id": "p1", "item": "Pantofi confortabili pentru explorare pe jos", "category": "clothing", "checked": false },
    { "id": "p2", "item": "Jachetă impermeabilă ușoară sau windbreaker", "category": "clothing", "checked": false },
    { "id": "p3", "item": "Ținută elegantă pentru o cină romantică în doi", "category": "clothing", "checked": false },
    { "id": "p4", "item": "Ochelari de soare și protecție UV", "category": "gear", "checked": false },
    { "id": "p5", "item": "Acumulator extern (powerbank) pentru fotografii", "category": "gear", "checked": false },
    { "id": "p6", "item": "Aparat foto sau trepied compact de călătorie", "category": "gear", "checked": false },
    { "id": "p7", "item": "Documente de identitate și bilete electronice", "category": "documents", "checked": false },
    { "id": "p8", "item": "Asigurare medicală de călătorie", "category": "documents", "checked": false },
    { "id": "p9", "item": "Sticlă reutilizabilă de apă și mini-trusă prim ajutor", "category": "comfort", "checked": false },
    { "id": "p10", "item": "Căști audio pentru călătoria cu avionul/trenul", "category": "comfort", "checked": false }
  ],
  "itinerary": [
    {
      "dayNumber": 1,
      "title": "Titlul primei zile (ex: Sosire & Primele Imagini din Centrul Istoric)",
      "description": "Descrierea activităților din Ziua 1.",
      "highlights": ["Punct de atracție 1", "Punct de atracție 2"],
      "targetCheckpoints": ["Reper 1", "Locație 2"]
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Clean markdown codeblocks if model wrapped in ```json
      const cleaned = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const packingList = Array.isArray(parsed.packingList)
        ? parsed.packingList.map((p: any, idx: number) => ({
            id: p.id || `pack-${idx + 1}`,
            item: String(p.item || ""),
            category: ["clothing", "gear", "documents", "comfort"].includes(p.category) ? p.category : "comfort",
            checked: Boolean(p.checked),
          }))
        : undefined;

      return {
        destination: parsed.destination || destination,
        city: parsed.city || detectedCity,
        country: parsed.country || detectedCountry,
        days: parsed.days || days,
        style: parsed.style || style,
        summary: parsed.summary || `O aventură memorabilă de ${days} zile în ${destination}.`,
        partnerTips: parsed.partnerTips || "Savurați momente liniștite la apus și arome locale autentice împreună.",
        itinerary: Array.isArray(parsed.itinerary) ? parsed.itinerary : [],
        allTargetCheckpoints: Array.isArray(parsed.allTargetCheckpoints) ? parsed.allTargetCheckpoints : [],
        packingList,
        weatherForecastSummary: parsed.weatherForecastSummary || {
          tempRange: "18°C - 25°C",
          description: "Vreme plăcută de călătorie, ideală pentru explorare și fotografie.",
        },
        localTips: Array.isArray(parsed.localTips) ? parsed.localTips : [],
        latitude,
        longitude,
      };
    } catch (err) {
      console.warn("Gemini API plan generation error, falling back to intelligent template:", err);
    }
  }

  // Fallback intelligent generator (if no API key provided or network timeout)
  const itinerary = [];
  const checkpoints = [
    `Centrul Vechi & Piețele Istorice din ${detectedCity}`,
    `Punct Panoramic & Belvedere în ${detectedCity}`,
    `Locație pentru Apusul de Aur în ${destination}`,
    `Piață Autentică & Degustare Culinară Tradițională`,
    `Bijuterie Ascunsă & Promenadă Romantică în Doi`,
  ];

  for (let i = 1; i <= days; i++) {
    itinerary.push({
      dayNumber: i,
      title: `Ziua ${i}: Farmecul și comorile din ${detectedCity}`,
      description: `Explorare pe străduțele autentice, repere culturale și cartiere pitorești din ${destination}. Opriri relaxante la cafenele locale și fotografii spectaculoase.`,
      highlights: [`Plimbare pitorească în ${detectedCity}`, "Degustare de bunătăți locale", "Punct foto la ora de aur"],
      targetCheckpoints: [checkpoints[(i - 1) % checkpoints.length]],
    });
  }

  const fallbackPacking = [
    { id: "p1", item: "Pantofi confortabili pentru mers mult", category: "clothing" as const, checked: false },
    { id: "p2", item: "Jachetă impermeabilă ușoară sau windbreaker", category: "clothing" as const, checked: false },
    { id: "p3", item: "Haine lejere potrivite pentru explorare", category: "clothing" as const, checked: false },
    { id: "p4", item: "Ochelari de soare și cremă protecție solară", category: "gear" as const, checked: false },
    { id: "p5", item: "Baterie externă (powerbank) și cabluri de încărcare", category: "gear" as const, checked: false },
    { id: "p6", item: "Aparat foto / Trepied compact de călătorie", category: "gear" as const, checked: false },
    { id: "p7", item: "Carte de identitate / Pașaport valabil", category: "documents" as const, checked: false },
    { id: "p8", item: "Card bancar și rezerve de numerar local", category: "documents" as const, checked: false },
    { id: "p9", item: "Mini-trusă de prim ajutor & medicamente de bază", category: "comfort" as const, checked: false },
    { id: "p10", item: "Sticlă reutilizabilă de apă", category: "comfort" as const, checked: false },
  ];

  return {
    destination,
    city: detectedCity,
    country: detectedCountry,
    days,
    style,
    summary: `O expediție de neuitat de ${days} zile la ${destination}. Creată pentru descoperire, relaxare și amintiri de neprețuit.`,
    partnerTips: withPartner ? "Faceți o plimbare la lăsarea serii pe promenada istorică pentru o lumină caldă perfectă de fotografii." : undefined,
    itinerary,
    allTargetCheckpoints: checkpoints,
    packingList: fallbackPacking,
    weatherForecastSummary: {
      tempRange: "16°C - 24°C",
      description: "Condiții sezoniere optime pentru explorare pietonală și plimbări în aer liber.",
    },
    localTips: [
      { title: "Plăți & Schimb Valutar", detail: "Cardul este utilizabil aproape oriunde; păstrați ceva numerar pentru suveniruri mărunte." },
      { title: "Standard Electric", detail: "Prize europene standard (230V); adaptori necesari doar pentru Marea Britanie/Elveția/SUA." },
      { title: "Ritmul Zilei", detail: "Multe magazine au pauză de prânz, iar serile prind viață după ora 19:00." },
    ],
    latitude,
    longitude,
  };
}

export interface AnnualWrappedParams {
  year: number;
  totalKm: number;
  tripsCount: number;
  countries: string[];
  cities: string[];
  topTripTitle?: string;
  withPartnerCount: number;
  apiKey?: string;
}

export interface AnnualWrappedReport {
  year: number;
  narrativeTitle: string;
  narrativeStory: string;
  partnerHighlight?: string;
  travelerArchetype: string;
  quote: string;
}

/**
 * Generate a personalized annual travel recap story using Google Gemini
 */
export async function generateAnnualWrapped(params: AnnualWrappedParams): Promise<AnnualWrappedReport> {
  const { year, totalKm, tripsCount, countries, cities, topTripTitle, withPartnerCount, apiKey } = params;

  const model = getGeminiModel(apiKey);

  if (model) {
    try {
      const prompt = `Ești cronicarul cosmic și naratorul oficial al aplicației "Wayward Atlas".
Scrie o recapitulare anuală de călătorii plină de căldură, nostalgie și entuziasm aventurier pentru anul ${year}.
Date reale ale călătorului:
- Punct de pornire: Sibiu, România.
- Kilometri totali parcurși pe Terra: ${Math.round(totalKm).toLocaleString()} km.
- Număr de călătorii: ${tripsCount}.
- Țări explorate: ${countries.length > 0 ? countries.join(", ") : "destinații interne"}.
- Orașe vizitate: ${cities.length > 0 ? cities.slice(0, 8).join(", ") : "diverse"}.
- Călătoria de suflet a anului: ${topTripTitle || "Aventurile din " + year}.
- Călătorii în doi cu partenerul: ${withPartnerCount} călătorii speciale.

Cerință strictă: Răspunde DOAR cu un JSON valid (fără markdown):
{
  "narrativeTitle": "Titlu poetic sau captivant (ex: '2024: Ocolul Zilelor Frumoase pe Meridianele Lumii')",
  "narrativeStory": "2 paragrafe armonioase și pline de farmec despre călătoriile parcurse din Sibiu, amintind locurile vizitate și bucuria de a explora planeta.",
  "partnerHighlight": "O frază de suflet despre ce a însemnat să împarți aceste drumuri cu partenerul tău.",
  "travelerArchetype": "O etichetă creativă (ex: 'Cartograf Romantico-Cosmic' sau 'Explorator de Meridiane')",
  "quote": "Un citat scurt de călătorie memorabil și optimist."
}`;

      const res = await model.generateContent(prompt);
      const text = res.response.text().replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(text);

      return {
        year,
        narrativeTitle: parsed.narrativeTitle || `Recapitularea Anului ${year} pe Glob`,
        narrativeStory: parsed.narrativeStory || `Anul ${year} a fost o veritabilă aventură pornită din Sibiu. Cu ${Math.round(totalKm).toLocaleString()} km acumulați și ${tripsCount} itinerarii finalizate, fiecare pas a adus peisaje spectaculoase și noi orizonturi.`,
        partnerHighlight: parsed.partnerHighlight || (withPartnerCount > 0 ? "Cele mai luminoase amintiri rămân cele împărtășite în doi, de la apusurile privite împreună până la pașii pe străzile noi." : undefined),
        travelerArchetype: parsed.travelerArchetype || "Explorator de Meridiane",
        quote: parsed.quote || "Călătoria nu este despre sosire, ci despre toate colțurile de lume care devin parte din noi.",
      };
    } catch (e) {
      console.warn("Gemini annual wrapped generation error:", e);
    }
  }

  // Fallback narrative if AI offline
  return {
    year,
    narrativeTitle: `Cronica Călătoriilor ${year}: Din Sibiu pe Meridianele Terrei`,
    narrativeStory: `Anul ${year} a redefinit harta aventurilor tale. Pornind din inima Transilvaniei, ai adăugat ${Math.round(totalKm).toLocaleString()} km la odometrul cosmic al Terrei, explorând ${countries.length} țări și lăsând amintiri de neșters în ${cities.slice(0, 4).join(", ") || "fiecare destinație"}. Fiecare răsărit pe drumuri străine a transformat visele în realitate.`,
    partnerHighlight: withPartnerCount > 0
      ? `Cu ${withPartnerCount} călătorii trăite în doi, anul acesta a demonstrat că cele mai frumoase peisaje sunt cele admirate alături de persoana iubită.`
      : undefined,
    travelerArchetype: "Cartograf al Orizonturilor Deschise",
    quote: "Lumea este o carte imensă, iar cei care călătoresc îi citesc cele mai luminoase pagini.",
  };
}

/**
 * Verify uploaded photos against the planned itinerary and checkpoints,
 * writing evocative travel memories and partner notes with Gemini
 */
export async function verifyTripAgainstPlan(params: VerifyTripParams): Promise<TravelAchievementReport> {
  const { tripTitle, plan, photos, apiKey } = params;
  const model = getGeminiModel(apiKey);

  const photoSummaries = photos.map((p, idx) => ({
    photoIndex: idx + 1,
    placeName: p.placeName || "Scenic place",
    city: p.city,
    country: p.country,
    tags: p.tags,
    takenAt: p.takenAt,
    url: p.url,
  }));

  const checkpoints = plan.allTargetCheckpoints || [];

  if (model && checkpoints.length > 0) {
    try {
      const prompt = `You are a warm, poetic, and meticulous travel journal AI for "Wayward Atlas".
We planned a trip titled "${tripTitle}" to "${plan.destination}".
Here are the PLANNED TARGET CHECKPOINTS:
${JSON.stringify(checkpoints, null, 2)}

Here are the PHOTOS UPLOADED from the completed journey (with places and detected tags):
${JSON.stringify(photoSummaries, null, 2)}

Compare the photos against the planned target checkpoints.
Evaluate:
1. Which checkpoints were successfully achieved/photographed (and which photo matches).
2. Which checkpoints were missed or not photographed.
3. Extra spontaneous discoveries or unexpected wonderful moments captured.
4. Calculate an achievement score from 0 to 100%.
5. Write a rich, evocative travel memories story (2-3 paragraphs) celebrating the real adventure.
6. Write a romantic, affectionate private note for the traveler and their partner ("Partener").

STRICT REQUIREMENT: Respond ONLY with a valid JSON object (no markdown formatting, no codeblocks):
{
  "score": 85,
  "achievedCount": 4,
  "totalPlanned": 5,
  "achieved": [
    {
      "name": "Checkpoint Name",
      "matchedPhotoUrl": "url if available",
      "commentary": "Brief comment on how this was captured"
    }
  ],
  "missed": [
    {
      "name": "Checkpoint Name",
      "tip": "Encouraging remark for next time"
    }
  ],
  "extraDiscoveries": [
    {
      "name": "Unplanned scenic spot",
      "commentary": "Why this spontaneous discovery was awesome"
    }
  ],
  "summaryText": "Evocative, inspiring travel story of the journey...",
  "partnerMemory": "Affectionate, heartwarming memory dedicated to the shared journey with the partner..."
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      return {
        score: typeof parsed.score === "number" ? parsed.score : 85,
        achievedCount: parsed.achieved?.length || checkpoints.length,
        totalPlanned: checkpoints.length,
        achieved: Array.isArray(parsed.achieved) ? parsed.achieved : [],
        missed: Array.isArray(parsed.missed) ? parsed.missed : [],
        extraDiscoveries: Array.isArray(parsed.extraDiscoveries) ? parsed.extraDiscoveries : [],
        summaryText: parsed.summaryText || `O călătorie spectaculoasă în ${plan.destination}, plină de momente memorabile.`,
        partnerMemory: parsed.partnerMemory || "Fiecare clipă împărtășită în doi a transformat această aventură într-o amintire prețioasă pentru totdeauna.",
      };
    } catch (err) {
      console.warn("Gemini trip verification error, using smart fallback heuristic:", err);
    }
  }

  // Fallback heuristic evaluation
  const achieved: Array<{ name: string; matchedPhotoUrl?: string; commentary: string }> = [];
  const missed: Array<{ name: string; tip: string }> = [];

  checkpoints.forEach((cp, idx) => {
    if (idx < photos.length) {
      achieved.push({
        name: cp,
        matchedPhotoUrl: photos[idx]?.url,
        commentary: `Imortalizat cu succes la ${photos[idx]?.placeName || plan.destination}!`,
      });
    } else {
      missed.push({
        name: cp,
        tip: "Rămâne pe lista noastră secretă pentru următoarea revenire!",
      });
    }
  });

  const score = checkpoints.length > 0 ? Math.round((achieved.length / checkpoints.length) * 100) : 100;

  return {
    score,
    achievedCount: achieved.length,
    totalPlanned: checkpoints.length,
    achieved,
    missed,
    extraDiscoveries: photos.length > checkpoints.length ? [
      {
        name: "Descoperiri Spontane pe Traseu",
        commentary: `${photos.length - checkpoints.length} fotografii surpriză realizate în afara traseului inițial.`,
      }
    ] : [],
    summaryText: `Călătoria în ${plan.destination} a fost o reușită deplină! Cu ${photos.length} cadre surprinse și ${achieved.length} obiective bifate din itinerariul planificat, albumul surprinde frumusețea autentică a locurilor explorate.`,
    partnerMemory: `Amintirile trăite împreună în această călătorie rămân gravate în inimă. Fiecare apus admirat în doi și fiecare străduță rătăcită a făcut aventura de neegalat!`,
  };
}

export interface CosmicTriviaParams {
  totalKm: number;
  equatorLaps: number;
  tripsCount: number;
  countries: string[];
  role: string;
  topDestinations?: string[];
  partnerTripsCount?: number;
  apiKey?: string;
}

export interface CosmicTriviaResult {
  funFact: string;
  cosmicComparison: string;
  astronomicalTip: string;
  partnerBanter?: string;
}

/**
 * Generate witty, humorous, science-grounded cosmic travel trivia tailored
 * to the user's real destinations, home base in Sibiu, and role permissions using Gemini AI.
 */
export async function generateCosmicTravelTrivia(params: CosmicTriviaParams): Promise<CosmicTriviaResult> {
  const {
    totalKm,
    equatorLaps,
    tripsCount,
    countries = [],
    role = "PUBLIC",
    topDestinations = [],
    partnerTripsCount = 0,
    apiKey,
  } = params;

  const model = getGeminiModel(apiKey);
  const homeOrigin = "Sibiu, România";
  const countriesStr = countries.length > 0 ? countries.join(", ") : "Europa și împrejurimi";
  const destStr = topDestinations.length > 0 ? topDestinations.join(", ") : "orașe fascinante";

  if (model) {
    try {
      const prompt = `You are a brilliant, witty, humorous astrophysicist and cosmic travel commentator for "Wayward Atlas".
The traveler's home base is "${homeOrigin}".
Here are the traveler's authentic exploration statistics:
- Total geodesic distance traveled: ${totalKm.toLocaleString()} km
- Earth Equator equivalent laps: ${equatorLaps} times around the globe
- Total completed expeditions: ${tripsCount}
- Countries explored: ${countriesStr}
- Notable destinations: ${destStr}
- User role context: ${role} (${role === "PARTNER" ? "Traveling as a couple with partner" : role === "ADMIN" ? "Master explorer & admin" : "Adventurous explorer"})
- Expeditions with partner: ${partnerTripsCount}

Cosmic Distance Benchmarks:
- Distance to the Moon: 384,400 km
- Distance to the Sun: 149,600,000 km (1 AU)
- Distance to Proxima Centauri (closest star): 40.178 trillion km

Generate a witty, entertaining, and scientifically accurate cosmic travel trivia response in ROMANIAN (with warm, playful humor):
1. "funFact": A hilarious and surprising comparison between their kilometers and everyday/terrestrial things (e.g. comparing to the Great Wall of China, espresso cups drunk along the road, or outrunning migratory birds).
2. "cosmicComparison": A witty cosmic reality check comparing their kilometers to the Moon, Sun, or Proxima Centauri (e.g., Apollo 11 lunar flight time, solar heat shield needs, or warp engine fuel).
3. "astronomicalTip": A funny piece of astronomical advice for their upcoming journey from Sibiu to outer space.
${role === "PARTNER" || role === "ADMIN" ? '4. "partnerBanter": A sweet, humorous comment about traveling together with their partner ("Partener"), such as GPS debates, who holds the snacks, or scenic romantic detours.' : ""}

STRICT REQUIREMENT: Output ONLY a valid JSON object (no markdown surrounding, no comments before or after). Format:
{
  "funFact": "...",
  "cosmicComparison": "...",
  "astronomicalTip": "..."${role === "PARTNER" || role === "ADMIN" ? ',\n  "partnerBanter": "..."' : ""}
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      return {
        funFact: parsed.funFact || `Cu ${totalKm.toLocaleString()} km plecați din Sibiu, ai înconjurat Ecuatorul de ${equatorLaps} ori!`,
        cosmicComparison: parsed.cosmicComparison || `Ai parcurs deja o fracțiune memorabilă din drumul spre Lună (384.400 km).`,
        astronomicalTip: parsed.astronomicalTip || `Data viitoare când decolezi spre stele, nu uita telescopul și o geacă groasă.`,
        partnerBanter: parsed.partnerBanter || (role === "PARTNER" || role === "ADMIN" ? "Călătoriile în doi fac chiar și ocolurile din cauza GPS-ului să pară descoperiri cosmice planificate!" : undefined),
      };
    } catch (err) {
      console.warn("Gemini cosmic trivia generation error, using smart fallback:", err);
    }
  }

  // Intelligent fallback heuristic when Gemini is not reachable
  const moonPct = ((totalKm / 384400) * 100).toFixed(1);
  return {
    funFact: `Cu ${totalKm.toLocaleString()} km parcurși pornind din Sibiu prin ${countriesStr}, ai fi putut parcurge Ecuatorul Pământului de ${equatorLaps} ori!`,
    cosmicComparison: `Ai acoperit ${moonPct}% din distanța medie până la Lună (384.400 km). Modulul lunar Apollo 11 a parcurs aceeași distanță în aproximativ 3 zile de zbor continuu!`,
    astronomicalTip: `Până la Proxima Centauri mai sunt 40 de trilioane de km — recomandăm un scaun confortabil și o rezervă generoasă de cafea de la cafenelele din Sibiu.`,
    partnerBanter: role === "PARTNER" || role === "ADMIN"
      ? `În doi, fiecare kilometru pe drum numără dublu: jumătate pentru destinație, jumătate pentru muzica aleasă de partener în mașină!`
      : undefined,
  };
}

/**
 * Translates travel content (title & description) from Romanian into all 4 major languages at once
 */
export async function translateTripContentAll(params: {
  title: string;
  description?: string;
  apiKey?: string;
}): Promise<Record<string, { title: string; description: string }>> {
  const { title, description = "", apiKey } = params;
  const key = apiKey || process.env.GEMINI_API_KEY;

  if (key) {
    const genAI = new GoogleGenerativeAI(key);
    const prompt = `You are an expert multilingual translator specializing in travel journals and travel writing.
Translate the following travel trip title and description from Romanian into English (en), German (de), Spanish (es), and French (fr).
Keep the tone natural, evocative, and elegant, maintaining place names accurately.

Title to translate:
"${title}"

Description to translate:
"${description}"

Respond STRICTLY with a valid JSON object without any markdown code fences or backticks:
{
  "en": { "title": "translated title in English", "description": "translated description in English" },
  "de": { "title": "translated title in German", "description": "translated description in German" },
  "es": { "title": "translated title in Spanish", "description": "translated description in Spanish" },
  "fr": { "title": "translated title in French", "description": "translated description in French" }
}`;

    for (const modelName of CANDIDATE_GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName }, { timeout: 12000 });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) {
          const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
          if (parsed.en?.title) {
            return {
              en: { title: parsed.en?.title || title, description: parsed.en?.description || description },
              de: { title: parsed.de?.title || title, description: parsed.de?.description || description },
              es: { title: parsed.es?.title || title, description: parsed.es?.description || description },
              fr: { title: parsed.fr?.title || title, description: parsed.fr?.description || description },
            };
          }
        }
      } catch (err: any) {
        console.warn(`[translateTripContentAll] Model ${modelName} failed:`, err?.status || err?.message);
      }
    }
  }

  // Fast translation fallback (ultra-reliable, 50ms)
  const [enTitle, enDesc, deTitle, deDesc, esTitle, esDesc, frTitle, frDesc] = await Promise.all([
    fastTranslate(title, "en"),
    description ? fastTranslate(description, "en") : Promise.resolve(""),
    fastTranslate(title, "de"),
    description ? fastTranslate(description, "de") : Promise.resolve(""),
    fastTranslate(title, "es"),
    description ? fastTranslate(description, "es") : Promise.resolve(""),
    fastTranslate(title, "fr"),
    description ? fastTranslate(description, "fr") : Promise.resolve(""),
  ]);

  return {
    en: { title: enTitle || title, description: enDesc || description },
    de: { title: deTitle || title, description: deDesc || description },
    es: { title: esTitle || title, description: esDesc || description },
    fr: { title: frTitle || title, description: frDesc || description },
  };
}

/**
 * Translates travel content (title & description) from Romanian into a single target language using Gemini with failover
 */
export async function translateTripContent(params: {
  title: string;
  description?: string;
  targetLang: string;
  apiKey?: string;
}): Promise<{ title: string; description: string }> {
  const { title, description = "", targetLang, apiKey } = params;
  if (targetLang === "ro") return { title, description };

  const key = apiKey || process.env.GEMINI_API_KEY;
  if (key) {
    const genAI = new GoogleGenerativeAI(key);
    const targetLangNames: Record<string, string> = {
      en: "English",
      de: "German",
      es: "Spanish",
      fr: "French",
      ro: "Romanian",
    };
    const langName = targetLangNames[targetLang] || targetLang;
    const prompt = `You are an expert multilingual translator specializing in travel writing and travel journals.
Translate the following travel trip title and description from Romanian into ${langName}.
Keep the tone evocative, natural, and elegant, maintaining place names accurately.

Title to translate:
"${title}"

Description to translate:
"${description}"

Respond strictly with a JSON object in this format (no markdown, no extra keys):
{
  "title": "translated title in ${langName}",
  "description": "translated description in ${langName}"
}`;

    for (const modelName of CANDIDATE_GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName }, { timeout: 10000 });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) {
          const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
          if (parsed.title) {
            return {
              title: parsed.title,
              description: parsed.description || description,
            };
          }
        }
      } catch (err: any) {
        console.warn(`[translateTripContent] Model ${modelName} failed for ${targetLang}:`, err?.status || err?.message);
      }
    }
  }

  // Fast translation fallback
  const [translatedTitle, translatedDesc] = await Promise.all([
    fastTranslate(title, targetLang),
    description ? fastTranslate(description, targetLang) : Promise.resolve(""),
  ]);

  return {
    title: translatedTitle || title,
    description: translatedDesc || description,
  };
}



