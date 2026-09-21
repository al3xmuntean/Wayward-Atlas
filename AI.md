# Wayward Atlas — AI & System Architectural Documentation (AI.md)

> **Document Version**: 1.0.0  
> **Target Audience**: AI Agents, Engineers, and Maintainers  
> **Last Updated**: 2026-09-21  
> **Purpose**: This document serves as the permanent, single source of truth describing all architectural principles, artificial intelligence engines, business logic, role-based security rules, odometry mathematics, and configuration details for **Wayward Atlas**.

---

## 1. System Overview & Technology Stack

Wayward Atlas is an interactive, privacy-first 3D travel journal, cosmic odometry engine, and showcase gallery.

- **Framework**: Next.js 15 (App Router, Server Components, API Routes)
- **UI & Runtime**: React 19, TypeScript
- **Styling**: TailwindCSS with CSS Nectar design system (olive-green palette, dark/light/system theme modes, Calibri typography, glassmorphism)
- **Database & ORM**: SQLite (`prisma/dev.db`) managed via Prisma ORM 6
- **Visual Engines**:
  - **Terra 3D**: Three.js & `globe.gl` WebGL interactive 3D globe with high-res Earth topology, night sky background, and offline Natural Earth GeoJSON country polygon highlights (`/data/world-countries.json`).
  - **Expedition Map**: Leaflet / OpenStreetMap for 2D cartographic exploration.
  - **Showcase Gallery**: CSS Nectar-inspired tile masonry with cosmic odometry counters, random travel spotlights, and partner highlights.
- **Icons**: Lucide React
- **Deployment**: Docker & Docker Compose (`wayward-atlas` container, Node 20 Alpine, standalone production build).

---

## 2. Artificial Intelligence Engine (Gemini AI)

All AI functionality is powered by the Google Gemini API (`@google/genai` SDK), configured in `src/lib/gemini.ts`.

### 2.1 AI Models & Resilience Strategy
- **Primary Model**: `gemini-2.5-flash`
- **Fallback Model**: `gemini-1.5-flash`
- **Error Shielding**: If the API key is missing or quota is exhausted, every endpoint gracefully degrades to pre-computed deterministic templates with realistic mock data, ensuring zero UI crashes.
- **Rate Limiting**: Sliding-window in-memory rate limiter (`src/lib/rate-limit.ts`) enforcing **10 requests per 60-second window** per client IP.

### 2.2 AI Endpoints & Capabilities

#### A. Smart Travel Planner (`POST /api/ai/travel-plan`)
- **Location**: `src/app/api/ai/travel-plan/route.ts`
- **Function**: `generateTravelPlan(destination, days, style, notes)` in `src/lib/gemini.ts`
- **Generates**:
  1. Day-by-day structured itinerary with descriptions and target photographic checkpoints.
  2. **Smart Packing Checklist** divided into 4 categories:
     - `clothing` (weather-appropriate apparel)
     - `gear` (cameras, chargers, power banks, adapters)
     - `documents` (passports, visas, insurance)
     - `comfort` (toiletries, travel pillows, first-aid)
  3. **Weather Forecast Summary**: Estimated temperature range and seasonal climate description.
  4. **Local Cultural & Practical Tips**: Currency, power plug types/voltages, local customs, and safety recommendations.
- **Access**: Restricted to `ADMIN` and `PARTNER` roles.

#### B. Atlas Wrapped (`POST /api/ai/wrapped`)
- **Location**: `src/app/api/ai/wrapped/route.ts`
- **Function**: `generateAnnualWrapped(params)` in `src/lib/gemini.ts`
- **Generates**:
  1. An annual retrospective story reel (5 slides, Spotify/Instagram story style).
  2. Traveler Archetype Classification (e.g., *Explorator de Meridiane*, *Pelerin al Orașelor Vechi*).
  3. A personalized year narrative celebrating discoveries and partner highlights.
  4. An inspiring travel quote tailored to the visited countries and kilometers traveled.
- **Odometry Integration**: Grounded in geodesic distances calculated from the home base in Sibiu, Romania.

#### C. Cosmic Scales & Trivia (`POST /api/ai/cosmic-stats`)
- **Location**: `src/app/api/ai/cosmic-stats/route.ts`
- **Function**: `generateCosmicTrivia(params)` in `src/lib/gemini.ts`
- **Generates**:
  1. Whimsical cosmic trivia comparing total travel kilometers to astronomical milestones:
     - Earth's Equator (40,075 km)
     - Distance to the Moon (384,400 km)
     - Distance to the Sun / 1 AU (149,597,870 km)
     - Distance to Proxima Centauri (4.25 light years / 40.18 trillion km)
  2. Humorous travel banter tailored to the user's top destinations and partner trips.

#### D. AI Trip Achievement Verification (`POST /api/ai/verify-trip`)
- **Location**: `src/app/api/ai/verify-trip/route.ts`
- **Function**: Validates uploaded trip photos against planned checkpoints and scores achievement percentage.

#### E. Reverse Geocoding & Suggestions (`POST /api/ai/suggest-location`)
- **Location**: `src/app/api/ai/suggest-location/route.ts`
- **Function**: Suggests GPS coordinates, country, and landmark names based on image metadata or search text.

---

## 3. Role-Based Access Control (RBAC) & Visibility Matrix

Wayward Atlas enforces a strict 5-tier permission hierarchy:

| Level | Role | Scope & Permissions |
|:---:|:---|:---|
| **0** | `PUBLIC` | Unauthenticated visitors. Country-level aggregated pins only; **strictly no human faces** (`hasPeople: false`); single designated country cover photo; year-level dates only (day/month masked). |
| **1** | `VIEWER` | Authenticated general guests. Can view public and viewer-tier expeditions and photos. |
| **2** | `CLOSE_FRIEND` | Friends circle. Unlocks photos containing friends, social moments, and shared group itineraries. |
| **3** | `PARTNER` | Intimate partner. Unlocks private partner travel notes, "În Doi" filters, dedicated partner metrics, and private couple photos. |
| **4** | `ADMIN` | Full administrative control. Studio upload manager, user role management, trip editing and deletion, full GPS inspection. |

### Access Enforcement:
- Server-side JWT authentication via cookie `wayward_session`.
- APIs enforce `getCurrentUser()` and evaluate `minRole` and `isPrivate` flags.
- **Deep-Link Protection**: Direct requests to private trips (`/api/trips/[id]`) or photos (`/api/photos/[id]`) return `401 AUTH_REQUIRED` (prompting login) or `403 FORBIDDEN` (insufficient role), triggering the client-side `AccessRestrictedModal`.

---

## 4. Sibiu Home Base Odometry Engine

All travel metrics originate from the user's permanent residence:
- **Home Base**: Sibiu, Romania
- **Coordinates**: `45.7983° N, 24.1256° E`
- **Module**: `src/lib/distance.ts`

### Mathematical Formulas:
1. **Haversine Geodesic Distance**:
   $$\Delta\sigma = 2 \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
   $$d = R \cdot \Delta\sigma \quad (R = 6371 \text{ km})$$
2. **Commercial Airway Factor**:
   Transit flights between Sibiu and destinations apply an airway multiplier factor of **1.15** to account for non-straight-line standard flight corridors and return round-trips.
3. **Exploration Distance**:
   Intra-trip sequential photos are sorted chronologically, calculating ground distance between consecutive exploration waypoints.

---

## 5. Virtual Passport & Scratch Map

- **Module**: `src/lib/passport.ts`
- **Components**: `src/components/VirtualPassportModal.tsx`, `src/components/Globe3D.tsx`
- **Data Source**: High-performance offline Natural Earth GeoJSON (`/data/world-countries.json`, 488 KB).

### Capabilities:
- **Country Name Normalization**: Maps multilingual country names (Romanian & English) to standard ISO 3166-1 `ISO_A2` and `ISO_A3` codes.
- **Visa & Entry Stamps**: Renders realistic rotating vintage rubber stamps with country flags, entry dates, and traveler ranks.
- **Exploration Percentages**: Calculates the percentage of the 195 UN sovereign nations explored.
- **3D Globe Highlighting**: Visited countries are highlighted with glowing olive/gold translucent polygons on Terra 3D, toggleable with a floating button.

---

## 6. Internationalization (i18n) Architecture

- **Supported Languages**:
  1. Română 🇷🇴 (`ro`) — Default
  2. English 🇬🇧 (`en`)
  3. Deutsch 🇩🇪 (`de`)
  4. Español 🇪🇸 (`es`)
  5. Français 🇫🇷 (`fr`)
- **Modules**:
  - `src/lib/i18n/types.ts`: Type definitions and language list.
  - `src/lib/i18n/translations.ts`: Key-value bundle dictionary organized by components (`common`, `nav`, `showcase`, `passport`, `wrapped`, `planner`, `drawer`, `share`, `auth`).
  - `src/lib/i18n/context.tsx`: `LanguageProvider` context and `useTranslation()` hook.
  - `src/components/LanguageSelector.tsx`: Accessible dropdown with country flags and native language names in both desktop Navbar and mobile drawer.
- **Persistence**: Automatically saved to `localStorage` key `wayward_lang` and updates `document.documentElement.lang`.

---

## 7. Deep-Linking & Social Sharing

- **Format**:
  - Trip Link: `https://<domain>/?trip=<tripId>`
  - Photo Link: `https://<domain>/?trip=<tripId>&photo=<photoId>`
- **Workflow**:
  1. User clicks the `Share` button in `TripDrawer` or `CssNectarShowcase`.
  2. The link is copied to the clipboard or shared via the native Web Share API (`navigator.share`).
  3. When an external visitor opens the link:
     - If public or viewer has matching credentials: The trip drawer opens and the camera flies directly to the destination.
     - If private or requires a higher tier: The `AccessRestrictedModal` opens, indicating the required role (e.g., *Partener*, *Prieten*) and offering a one-click login modal.

---

## 8. Accessibility & Compliance (WCAG 2.1 AA)

- **Keyboard Navigation**: All modals implement Focus Trapping, Escape key dismissal, and autofocus restoration via `useModalA11y` (`src/hooks/useModalA11y.ts`).
- **Screen Reader Support**: Live region announcements (`aria-live="polite"`) announce route changes, language selections, and clipboard operations.
- **Skip Links**: Accessible skip link (`#main-content`) at the top of the body for keyboard users.
- **Contrast**: High-contrast text tokens tailored for both dark and light themes.

---

## 9. Environment Variables & Setup

Create a `.env` file in the project root:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secure-random-jwt-secret-key"
GEMINI_API_KEY="your-google-gemini-api-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

### Useful CLI Commands:
```bash
# Install dependencies
npm install

# Run database migrations
npx prisma db push

# Seed sample data
node prisma/seed.js

# Compile production bundle
npm run build

# Run local development server
npm run dev

# Run Docker production container
docker compose up -d --build
```
