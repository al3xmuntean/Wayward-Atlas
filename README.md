# 🌍 Wayward Atlas — 3D Earth Travel Journal & Photo Map

A **100% self-hosted** web application to explore and document your journeys across an interactive **3D Spherical Earth Globe (Terra Sferică)**. Features automatic GPS coordinate extraction from uploaded photos, AI-assisted location identification for photos missing metadata, AI-powered privacy protection (automatic person detection), and semantic search based on visual scene elements.

---

## ✨ Key Features

- 🌐 **True 3D Spherical Earth Globe (Terra Sferică 3D)**:
  - Powered by **`globe.gl` & Three.js** WebGL rendering.
  - Photorealistic high-resolution Earth textures (Blue Marble & night lights), topography bump maps, atmospheric blue glow, and deep space starfield.
  - **Full 360° free 3D rotation**: click & drag to spin the Earth sphere in any direction!
  - Custom teardrop markers with live photo thumbnails, pulse rings, and hover previews anchored directly to the curved 3D sphere.
  - One-click toggle between **Terra Sferic 3D** (Spherical Globe) and **Hartă Detaliată** (detailed MapLibre street map).

- 🔒 **Stealth Private Portal (Hidden Login)**:
  - No login buttons or banners in the public view. Visitors only see the clean, immersive 3D globe.
  - Dedicated secret login portal at **`/portal`** (or `/login`). Share this URL only with close friends.

- 🔑 **Google Sign-In & User Management**:
  - Sign in with **Google** or Email/Password.
  - **Admin Users & Permissions Dashboard**: Admin can promote registered users to **Admin** (upload & manage) or toggle **"Vede Privat"** (grants full access to private albums).

- ⏳ **Timeline Slider & Temporal Filtering**:
  - Floating glassmorphic scrubber at the bottom of the globe to explore by year (e.g., `2021`–`2024`).
  - Drill-down selector for individual months.
  - **Auto-Play Tour Mode**: automatically cycles through years, dynamically displaying and hiding pins like a documentary film.
  - **Guest Privacy Protection**: unauthenticated visitors see only the **year** of the trip; exact days and months are masked.

- 🔍 **Universal Globe Search**:
  - Multi-criteria real-time search by:
    - **Year / Time Period** (e.g., *"2023"*, *"2021"*)
    - **City or Country** (e.g., *"Rome"*, *"Kyoto"*, *"Switzerland"*)
    - **AI Visual Tags & Objects** (e.g., *"beach"*, *"mountain"*, *"sunset"*, *"architecture"*, *"temple"*)
  - Quick-filter suggestion chips for popular tags.

- 📸 **Smart Upload & AI Processing Pipeline**:
  - **Client-Side EXIF Parsing**: extracts latitude, longitude, and timestamps directly in the browser via `exifr` with zero server overhead.
  - **AI Privacy Detection**: browser-based TensorFlow.js model scans photos for people/faces; photos with detected humans are automatically flagged as **Private** (with one-click admin confirmation/override).
  - **AI Location Fallback**: when GPS is absent, AI analyzes visual landmarks and suggests candidate coordinates (integrates with local LM Studio on port `1234` or open geocoding).
  - **AI Object & Scene Tagging**: automatically identifies visual categories (cars, boats, mountains, beaches, monuments) to index photos for instant search.

- 🐳 **100% Self-Hosted & Privacy-First**:
  - Zero mandatory third-party cloud services.
  - Local SQLite database managed via Prisma ORM.
  - Local file storage with automatic Sharp WebP compression and thumbnail generation.
  - Production-ready `Dockerfile` and `docker-compose.yml`.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies:
```bash
npm install --legacy-peer-deps
```

### 2. Initialize Database & Seed Demo Data:
```bash
npx prisma generate
npx prisma db push
node prisma/seed.js
```

### 3. Start the Development Server:
```bash
npm run dev
```

Open your browser at **`http://localhost:3000`**.

---

## 🔐 Secret Login Portal & Demo Accounts

To log in, visit the private route:
👉 **`http://localhost:3000/portal`**

| Role | Email | Password | Permissions & Visibility |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@wayward.atlas` | `admin123` | Superuser: full access, Studio upload & review, user roles management, travel planning & verification |
| **Partner** | `partner@wayward.atlas` | `partner123` | Amintiri în doi, private couple memories & notes, planned trips pin & Travel Assist |
| **Close Friend** | `friend@wayward.atlas` | `friend123` | Can view trips with human photos (`hasPeople: true`) + landscapes |
| **Viewer** | `viewer@wayward.atlas` | `viewer123` | Full day/month details, but STRICTLY landscape/architecture only (no human photos) |
| **Public** | *(No login)* | — | Aggregated country-level pins, 1 official showcase image per country, masked year dates |

---

## ✈️ Travel Assist — AI Journey Planner & Verification (Google Gemini)

- **AI Itinerary & Checkpoints Planner**:
  - Enter any destination, duration (1-21 days), timeframe, and travel style.
  - Powered by **Google Gemini AI** (or fallback local LLM / heuristics), generates day-by-day itineraries and a curated list of target checkpoints (monuments, scenic viewpoints, authentic experiences).
  - Special partner recommendations and romantic spots when traveling with a partner.
- **Planned Pins on 3D Globe**:
  - Visible exclusively to **Admin** and **Partner** with a distinctive emerald/teal floating pin.
- **Post-Trip Photo Verification & Memories**:
  - After traveling, upload photos to the planned trip.
  - One-click **"Verifică cu Gemini AI"**: Gemini inspects the uploaded photos against the planned checkpoints, scores achievements, highlights surprise spontaneous discoveries, and drafts an evocative travel memory story celebrating the journey!

## 🌐 Google OAuth Configuration (Optional)

To enable real Google Sign-In with your own Google Cloud credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Add Authorized Redirect URI:
   `http://localhost:3000/api/auth/google/callback` (or your domain in production).
4. Add the keys to your `.env` file:
   ```env
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```
*(If credentials are not yet configured, the "Continue with Google" button automatically uses a safe demo sign-in so you can test the flow immediately!)*

---

## 🐳 Production Deployment with Docker Compose

Deploy on any VPS (Hetzner, DigitalOcean, self-hosted home server):

```bash
docker compose up -d --build
```

### Persistent Data Volumes:
- `atlas_db`: stores the SQLite database (`/app/prisma`).
- `atlas_media`: stores uploaded photos and thumbnails (`/app/public/uploads`).
